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
    SensorAlertState,
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


@dataclass
class Delivery:
    """What Expo did with one station's batch of alerts."""

    accepted: int = 0
    cleared: int = 0
    # Errors worth trying again: anything that is not a device that has
    # unregistered, plus messages Expo answered 200 to without a ticket.
    retriable_failures: int = 0

    @property
    def delivered(self) -> bool:
        """Whether the alerting state may advance past this level.

        The partial-delivery policy, stated once: one accepted message is
        enough. Retrying the whole station because a single token was rate
        limited would re-notify everyone the first attempt did reach, and
        duplicate alerts are the failure this feature exists to avoid.

        Nothing to retry also counts — no follower holds a token, or every
        token turned out to be dead — since a later run would find exactly the
        same nobody to send to.
        """
        return self.accepted > 0 or self.retriable_failures == 0


def should_alert(level: str, last_alerted_level: str | None) -> bool:
    """Whether a station at ``level`` warrants notifying its followers now.

    Mirrors the rule the app already applies to its own local notifications:
    only alert-worthy levels, and only when the air has actually got worse than
    what these followers were last told. Without the second half, a station
    hovering at the boundary would notify on every single reading.

    ``last_alerted_level`` is blank both for a station that has never alerted
    and for one that has since recovered to a safe level (see
    :meth:`_remember`), so the next bad episode alerts from its first reading
    rather than having to beat the worst level of the previous one.
    """
    if level not in ALERT_LEVELS:
        return False
    if not last_alerted_level:
        return True
    return LEVEL_RANK[level] > LEVEL_RANK[last_alerted_level]


def _remember(state: SensorAlertState, level: str, *, alerted: bool) -> None:
    """Writes back what this run saw, and whether it alerted on it."""
    state.last_level = level
    if alerted:
        state.last_alerted_level = level
    elif level not in ALERT_LEVELS:
        # Recovered. Clearing this is what ends the episode: without it a
        # station that alerted at `hazardous` could never alert again, since no
        # later level outranks it.
        state.last_alerted_level = ""
    state.save(update_fields=["last_level", "last_alerted_level", "updated_at"])


def _tokens_following(station_code: str) -> list[str]:
    """Push tokens of every installation following ``station_code``.

    Deduplicated, even though ``uniq_active_push_token`` now keeps a live token
    on a single installation: sending the same device two copies of one alert
    is the failure this whole path is trying to avoid, and it is cheap to be
    sure of it here rather than infer it from a constraint two models away.
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


def _is_dead(ticket: dict) -> bool:
    """Whether Expo says this token belongs to an app that is gone.

    Only ``DeviceNotRegistered`` counts — other errors are transient and acting
    on them would lose a live device's token.
    """
    return (
        ticket.get("status") == "error"
        and (ticket.get("details") or {}).get("error") == "DeviceNotRegistered"
    )


def _clear_dead_tokens(tokens: list[str], tickets: list[dict]) -> int:
    """Blanks the tokens Expo says are no longer registered.

    An uninstalled app keeps its row forever otherwise, and every later run
    pays to deliver to it.
    """
    dead = [token for token, ticket in zip(tokens, tickets) if _is_dead(ticket)]
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


def notify_followers(station: Stations, level: str, aqi: float) -> Delivery:
    """Sends one alert about ``station`` to everyone following it."""
    delivery = Delivery()

    tokens = _tokens_following(station.station_code)
    if not tokens:
        logger.info("No registered tokens follow %s", station.station_code)
        return delivery

    for start in range(0, len(tokens), EXPO_BATCH_SIZE):
        batch = tokens[start : start + EXPO_BATCH_SIZE]
        messages = [_message(token, station, level, aqi) for token in batch]
        tickets = _post_batch(messages)
        delivery.accepted += sum(1 for t in tickets if t.get("status") == "ok")
        delivery.cleared += _clear_dead_tokens(batch, tickets)
        # A 200 with fewer tickets than messages, or none at all, is not a
        # delivery: those messages were never accepted and there is no ticket
        # to check later, so they count as failures like any rejection does.
        delivery.retriable_failures += len(batch) - len(tickets[: len(batch)])
        delivery.retriable_failures += sum(
            1
            for ticket in tickets[: len(batch)]
            if ticket.get("status") != "ok" and not _is_dead(ticket)
        )

    return delivery


def send_sensor_alerts(dry_run: bool = False) -> SendResult:
    """Checks every followed station and alerts the ones that have worsened.

    Only stations somebody actually follows are read: with no followers there
    is no one to notify, and the reading would be wasted work.

    Every station that is read has its level written to
    :class:`SensorAlertState`, alert or not — that record of the safe readings
    is what lets the sender tell a station that has recovered from one still
    sitting at the level it last warned about.
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
            # Rows without a timestamp are excluded rather than sorted around:
            # `date_utc` is nullable and PostgreSQL puts nulls first on a
            # descending sort, so one undated row would shadow the genuinely
            # latest reading and alert on air of unknown age.
            StationReadingsGold.objects.filter(
                station_id=station.id, date_utc__isnull=False
            )
            .order_by("-date_utc")
            .first()
        )
        if reading is None or reading.aqi_pm2_5 is None:
            continue

        result.considered += 1
        classified = classify_aqi(reading.aqi_pm2_5)
        if classified is None:
            continue
        level = {
            "unhealthy_sensitive": "unhealthySensitive",
            "very_unhealthy": "veryUnhealthy",
        }.get(classified["key"], classified["key"])

        if dry_run:
            state = SensorAlertState.objects.filter(station_code=station_code).first()
            if should_alert(level, state.last_alerted_level if state else ""):
                result.alerted_stations += 1
            continue

        try:
            with transaction.atomic():
                # Held for the whole send. Two overlapping scheduled runs would
                # otherwise both read the same state, both decide to alert and
                # both call Expo before either wrote anything back — the same
                # warning twice on one phone.
                state = SensorAlertState.lock(station_code)
                if not should_alert(level, state.last_alerted_level):
                    # Still recorded: a reading below the alert threshold is
                    # what ends an episode and lets the station alert again.
                    _remember(state, level, alerted=False)
                    continue

                delivery = notify_followers(station, level, reading.aqi_pm2_5)
                if delivery.accepted:
                    SensorAlert.record(
                        station_code, level, reading.aqi_pm2_5, delivery.accepted
                    )
                _remember(state, level, alerted=delivery.delivered)
        except requests.RequestException as error:
            # One station's delivery failing must not stop the others, and the
            # state is deliberately left untouched so the next run retries it.
            message = f"{station_code}: {error}"
            logger.error("Push delivery failed for %s", message)
            result.errors.append(message)
            continue

        result.tokens_cleared += delivery.cleared

        if not delivery.delivered:
            # Expo answered, but for nobody. Leaving `last_alerted_level` where
            # it was is what makes the next run try this level again instead of
            # treating followers as warned.
            message = (
                f"{station_code}: {delivery.retriable_failures} message(s) rejected, "
                "none accepted; will retry"
            )
            logger.warning("Push delivery not accepted for %s", message)
            result.errors.append(message)
            continue

        result.alerted_stations += 1
        result.messages_sent += delivery.accepted

    return result


def is_configured() -> bool:
    """Whether alerts should be attempted at all in this environment."""
    return bool(getattr(settings, "SENSOR_ALERTS_ENABLED", False))
