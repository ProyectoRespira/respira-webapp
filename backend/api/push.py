"""Per-sensor push alerts, sent to the devices that follow each sensor.

The audience is :class:`DeviceFollower` — the same rows the app writes when a
user follows a sensor. Deriving it from anywhere else (a segment in the push
provider, say) would mean a second copy that can drift, and drift here means
somebody paying for a leased sensor silently stops being warned about their own
air.

Delivery goes through Expo's push service, which is what the tokens are for:
`PushWaveClient.init()` obtains an Expo push token on the device, and the app
registers it against its installation. PushWave keeps handling the regional
campaigns it already handles; this path exists because "notify exactly the
followers of station X when it crosses a threshold" has to be driven by our own
data.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field

import requests
from django.conf import settings
from django.db import transaction
from django.utils import timezone

from .aqi import classify_aqi
from .models import (
    DeviceFollower,
    DeviceInstallation,
    SensorAlert,
    StationReadingsGold,
    Stations,
)

logger = logging.getLogger(__name__)

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"

# Expo accepts at most 100 messages per request.
EXPO_BATCH_SIZE = 100

REQUEST_TIMEOUT_SECONDS = 15

# Levels worth interrupting somebody for. "Good" and "moderate" are not alerts;
# sending them would train people to dismiss the ones that matter.
ALERT_LEVELS = ("unhealthySensitive", "unhealthy", "veryUnhealthy", "hazardous")

LEVEL_RANK = {
    "good": 0,
    "moderate": 1,
    "unhealthySensitive": 2,
    "unhealthy": 3,
    "veryUnhealthy": 4,
    "hazardous": 5,
}

# Spanish copy, mirroring the strings the app already ships for its own local
# notifications (`src/i18n/ui.ts`, `aqi.notif.*`). The device shows whatever the
# payload carries, so the wording lives here for the alerts we originate.
LEVEL_COPY = {
    "unhealthySensitive": (
        "Precaución para grupos sensibles",
        "La calidad del aire en {station} puede afectar a personas sensibles. "
        "Reducí actividades físicas prolongadas al aire libre.",
    ),
    "unhealthy": (
        "Calidad del aire insalubre",
        "{station} registra aire insalubre. Reducí al mínimo la exposición "
        "prolongada al aire libre.",
    ),
    "veryUnhealthy": (
        "Alerta de calidad del aire",
        "{station} registra aire muy insalubre. Evitá actividades al aire libre.",
    ),
    "hazardous": (
        "Alerta sanitaria por calidad del aire",
        "{station} registra aire peligroso. Permanecé en interiores y evitá la "
        "exposición al aire exterior.",
    ),
}


@dataclass
class SendResult:
    """What one run did, for logging and for the management command's output."""

    considered: int = 0
    alerted_stations: int = 0
    messages_sent: int = 0
    tokens_cleared: int = 0
    errors: list[str] = field(default_factory=list)


def should_alert(level: str, last_level: str | None) -> bool:
    """Whether a station at ``level`` warrants notifying its followers now.

    Mirrors the rule the app already applies to its own local notifications:
    only alert-worthy levels, and only when the air has actually got worse than
    what these followers were last told. Without the second half, a station
    hovering at the boundary would notify on every single reading.
    """
    if level not in ALERT_LEVELS:
        return False
    if last_level is None:
        return True
    return LEVEL_RANK[level] > LEVEL_RANK[last_level]


def _tokens_following(station_code: str) -> list[str]:
    """Push tokens of every installation following ``station_code``.

    Deduplicated: two installations can legitimately hold the same token for a
    while after a reinstall, and the device should be told once.
    """
    tokens = (
        DeviceInstallation.objects.filter(follows__station_code=station_code)
        .exclude(push_token="")
        # `order_by()` clears the model's default ordering. Without it Django
        # adds `updated_at` to the SELECT so it can sort, and DISTINCT then
        # operates over the (token, updated_at) pair — which never collides, so
        # the deduplication silently does nothing and the device is notified
        # once per installation holding the token.
        .order_by()
        .values_list("push_token", flat=True)
        .distinct()
    )
    return list(tokens)


def _message(token: str, station: Stations, level: str, aqi: float) -> dict:
    title, body = LEVEL_COPY[level]
    return {
        "to": token,
        "title": title,
        "body": body.format(station=station.name),
        "sound": "default",
        "data": {
            "type": "sensor_alert",
            # The stable code, never the id: dbt regenerates station ids on
            # every run, so an id in a payload can already mean a different
            # sensor by the time the notification is opened. The app resolves
            # this code against the follows it holds.
            "station_code": station.station_code,
            "aqi": round(aqi),
            "level": level,
        },
    }


def _clear_dead_tokens(tokens: list[str], tickets: list[dict]) -> int:
    """Blanks the tokens Expo says are no longer registered.

    An uninstalled app keeps its row forever otherwise, and every later run
    pays to deliver to it. Only ``DeviceNotRegistered`` is acted on — other
    errors are transient and would lose a live device's token.
    """
    dead = [
        token
        for token, ticket in zip(tokens, tickets)
        if ticket.get("status") == "error"
        and ticket.get("details", {}).get("error") == "DeviceNotRegistered"
    ]
    if not dead:
        return 0

    return DeviceInstallation.objects.filter(push_token__in=dead).update(
        push_token="", updated_at=timezone.now()
    )


def _post_batch(messages: list[dict]) -> list[dict]:
    response = requests.post(
        EXPO_PUSH_URL,
        json=messages,
        headers={"Accept": "application/json", "Content-Type": "application/json"},
        timeout=REQUEST_TIMEOUT_SECONDS,
    )
    response.raise_for_status()
    payload = response.json()
    data = payload.get("data")
    return data if isinstance(data, list) else []


def notify_followers(station: Stations, level: str, aqi: float) -> tuple[int, int]:
    """Sends one alert about ``station`` to everyone following it.

    Returns ``(messages_sent, tokens_cleared)``.
    """
    tokens = _tokens_following(station.station_code)
    if not tokens:
        logger.info("No registered tokens follow %s", station.station_code)
        return 0, 0

    sent = 0
    cleared = 0
    for start in range(0, len(tokens), EXPO_BATCH_SIZE):
        batch = tokens[start : start + EXPO_BATCH_SIZE]
        messages = [_message(token, station, level, aqi) for token in batch]
        tickets = _post_batch(messages)
        sent += sum(1 for ticket in tickets if ticket.get("status") == "ok")
        cleared += _clear_dead_tokens(batch, tickets)

    return sent, cleared


def send_sensor_alerts(dry_run: bool = False) -> SendResult:
    """Checks every followed station and alerts the ones that have worsened.

    Only stations somebody actually follows are read: with no followers there
    is no one to notify, and the reading would be wasted work.
    """
    result = SendResult()

    followed_codes = (
        DeviceFollower.objects.values_list("station_code", flat=True)
        .distinct()
        .order_by()
    )

    for station_code in followed_codes:
        station = Stations.objects.filter(station_code=station_code).first()
        if station is None:
            # The pipeline dropped it. The follows survive so the app can tell
            # the user, but there is nothing to read.
            continue
        if not station.is_station_on:
            continue

        reading = (
            StationReadingsGold.objects.filter(station_id=station.id)
            .order_by("-date_utc")
            .first()
        )
        if reading is None or reading.aqi_pm2_5 is None:
            continue

        result.considered += 1
        classified = classify_aqi(reading.aqi_pm2_5)
        if classified is None:
            continue
        level = classified["key"]

        last = SensorAlert.objects.filter(station_code=station_code).first()
        if not should_alert(level, last.level if last else None):
            continue

        if dry_run:
            result.alerted_stations += 1
            continue

        try:
            with transaction.atomic():
                sent, cleared = notify_followers(station, level, reading.aqi_pm2_5)
                SensorAlert.record(station_code, level, reading.aqi_pm2_5, sent)
        except requests.RequestException as error:
            # One station's delivery failing must not stop the others, and the
            # alert is deliberately *not* recorded so the next run retries it.
            message = f"{station_code}: {error}"
            logger.error("Push delivery failed for %s", message)
            result.errors.append(message)
            continue

        result.alerted_stations += 1
        result.messages_sent += sent
        result.tokens_cleared += cleared

    return result


def is_configured() -> bool:
    """Whether alerts should be attempted at all in this environment."""
    return bool(getattr(settings, "SENSOR_ALERTS_ENABLED", False))
