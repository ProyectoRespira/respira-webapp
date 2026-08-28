"""Tests for the per-sensor push alerts (api.push).

The rule the whole feature turns on: an alert about a sensor reaches the
devices that follow *that* sensor, and no others. These tests exercise it
against the real follower tables rather than a mock of them, because the
audience being derived from `DeviceFollower` is the point.

Expo's push service is the only thing stubbed — the tests assert on what would
be sent, which is what determines who gets warned.
"""

from unittest.mock import patch

import requests
from django.test import TestCase
from django.utils import timezone

from .models import (
    DeviceFollower,
    DeviceInstallation,
    Regions,
    SensorAlert,
    StationReadingsGold,
    Stations,
)
from .push import send_sensor_alerts, should_alert

INSTALLATION_ID = "8f14e45f-ceea-467e-bd97-1a2b3c4d5e6f"
OTHER_INSTALLATION_ID = "2c1f9b4a-77d3-4e21-9a5c-6b0e8d3f1a2b"


def ok_tickets(messages):
    """Expo's success shape: one ticket per message, in order."""
    return {"data": [{"status": "ok", "id": f"tk-{i}"} for i in range(len(messages))]}


class ShouldAlertTests(TestCase):
    def test_only_alert_worthy_levels_notify(self):
        self.assertFalse(should_alert("good", None))
        self.assertFalse(should_alert("moderate", None))
        self.assertTrue(should_alert("unhealthySensitive", None))
        self.assertTrue(should_alert("hazardous", None))

    def test_the_same_level_does_not_notify_twice(self):
        # A station sitting just over a threshold would otherwise notify on
        # every reading, which trains people to ignore the alerts that matter.
        self.assertFalse(should_alert("unhealthy", "unhealthy"))

    def test_only_a_worsening_notifies(self):
        self.assertTrue(should_alert("veryUnhealthy", "unhealthy"))
        self.assertFalse(should_alert("unhealthySensitive", "unhealthy"))

    def test_improving_into_a_safe_level_does_not_notify(self):
        self.assertFalse(should_alert("good", "hazardous"))


class SendSensorAlertsTests(TestCase):
    def setUp(self):
        self.region = Regions.objects.create(name="Gran Asunción", region_code="GA")
        self.station = Stations.objects.create(
            name="Respira: Villa Morra",
            region=self.region,
            station_code="RSP-001",
            is_station_on=True,
        )
        self.other_station = Stations.objects.create(
            name="Respira: San Lorenzo",
            region=self.region,
            station_code="RSP-002",
            is_station_on=True,
        )

    def _reading(self, station, aqi):
        return StationReadingsGold.objects.create(
            station=station, date_utc=timezone.now(), aqi_pm2_5=aqi
        )

    def _follower(self, station_code, token, installation_id=INSTALLATION_ID):
        installation, _ = DeviceInstallation.register(installation_id, push_token=token)
        DeviceFollower.objects.create(
            installation=installation, station_code=station_code
        )
        return installation

    def test_only_the_followers_of_that_sensor_are_notified(self):
        # The rule the whole feature exists for.
        self._follower("RSP-001", "token-a")
        self._follower("RSP-002", "token-b", OTHER_INSTALLATION_ID)
        self._reading(self.station, 165)
        self._reading(self.other_station, 20)

        capture = Capture()
        with patch("api.push._post_batch", side_effect=capture):
            send_sensor_alerts()

        self.assertEqual(capture.recipients(), ["token-a"])

    def test_the_payload_identifies_the_sensor_by_its_stable_code(self):
        self._follower("RSP-001", "token-a")
        self._reading(self.station, 165)

        capture = Capture()
        with patch("api.push._post_batch", side_effect=capture):
            send_sensor_alerts()

        [message] = capture.messages
        self.assertEqual(message["data"]["type"], "sensor_alert")
        # The code, not the id: dbt regenerates station ids on every run, so an
        # id here could mean a different sensor by the time it is opened.
        self.assertEqual(message["data"]["station_code"], "RSP-001")
        self.assertNotIn("station", message["data"])
        self.assertEqual(message["data"]["level"], "unhealthy")
        self.assertIn(self.station.name, message["body"])

    def test_a_station_nobody_follows_is_never_read(self):
        self._reading(self.station, 300)

        capture = Capture()
        with patch("api.push._post_batch", side_effect=capture):
            result = send_sensor_alerts()

        self.assertEqual(result.considered, 0)
        self.assertEqual(capture.messages, [])

    def test_a_second_run_at_the_same_level_sends_nothing(self):
        self._follower("RSP-001", "token-a")
        self._reading(self.station, 165)

        capture = Capture()
        with patch("api.push._post_batch", side_effect=capture):
            send_sensor_alerts()
            first = len(capture.messages)
            send_sensor_alerts()

        self.assertEqual(first, 1)
        self.assertEqual(len(capture.messages), 1)

    def test_a_worsening_sends_again(self):
        self._follower("RSP-001", "token-a")
        self._reading(self.station, 165)

        capture = Capture()
        with patch("api.push._post_batch", side_effect=capture):
            send_sensor_alerts()
            self._reading(self.station, 320)
            send_sensor_alerts()

        self.assertEqual(
            [m["data"]["level"] for m in capture.messages], ["unhealthy", "hazardous"]
        )

    def test_a_station_switched_off_is_skipped(self):
        self._follower("RSP-001", "token-a")
        self._reading(self.station, 300)
        self.station.is_station_on = False
        self.station.save(update_fields=["is_station_on"])

        capture = Capture()
        with patch("api.push._post_batch", side_effect=capture):
            result = send_sensor_alerts()

        self.assertEqual(result.considered, 0)
        self.assertEqual(capture.messages, [])

    def test_a_follow_whose_station_the_pipeline_dropped_is_skipped(self):
        self._follower("GONE", "token-a")

        capture = Capture()
        with patch("api.push._post_batch", side_effect=capture):
            result = send_sensor_alerts()

        self.assertEqual(result.considered, 0)
        self.assertEqual(capture.messages, [])

    def test_an_installation_without_a_token_is_skipped(self):
        installation, _ = DeviceInstallation.register(INSTALLATION_ID)
        DeviceFollower.objects.create(installation=installation, station_code="RSP-001")
        self._reading(self.station, 165)

        capture = Capture()
        with patch("api.push._post_batch", side_effect=capture):
            result = send_sensor_alerts()

        # Read and judged worth alerting, but nobody reachable to alert.
        self.assertEqual(result.considered, 1)
        self.assertEqual(capture.messages, [])

    def test_a_token_shared_by_two_installations_is_sent_once(self):
        # A reinstall can leave the same token on two installations briefly.
        # The device is one device and should be told once.
        self._follower("RSP-001", "same-token", INSTALLATION_ID)
        second, _ = DeviceInstallation.objects.get_or_create(
            installation_id=OTHER_INSTALLATION_ID, defaults={"push_token": "same-token"}
        )
        DeviceFollower.objects.create(installation=second, station_code="RSP-001")
        self._reading(self.station, 165)

        capture = Capture()
        with patch("api.push._post_batch", side_effect=capture):
            send_sensor_alerts()

        self.assertEqual(capture.recipients(), ["same-token"])

    def test_a_dead_token_is_cleared(self):
        self._follower("RSP-001", "token-a")
        self._reading(self.station, 165)

        def dead(messages):
            return [
                {"status": "error", "details": {"error": "DeviceNotRegistered"}}
                for _ in messages
            ]

        with patch("api.push._post_batch", side_effect=dead):
            result = send_sensor_alerts()

        self.assertEqual(result.tokens_cleared, 1)
        self.assertEqual(
            DeviceInstallation.objects.get(installation_id=INSTALLATION_ID).push_token,
            "",
        )

    def test_a_transient_error_does_not_clear_the_token(self):
        self._follower("RSP-001", "token-a")
        self._reading(self.station, 165)

        def throttled(messages):
            return [
                {"status": "error", "details": {"error": "MessageRateExceeded"}}
                for _ in messages
            ]

        with patch("api.push._post_batch", side_effect=throttled):
            send_sensor_alerts()

        self.assertNotEqual(
            DeviceInstallation.objects.get(installation_id=INSTALLATION_ID).push_token,
            "",
        )

    def test_a_delivery_failure_is_not_recorded_so_the_next_run_retries(self):
        self._follower("RSP-001", "token-a")
        self._reading(self.station, 165)

        with patch(
            "api.push._post_batch", side_effect=requests.ConnectionError("down")
        ):
            result = send_sensor_alerts()

        self.assertEqual(len(result.errors), 1)
        self.assertEqual(SensorAlert.objects.count(), 0)

    def test_one_station_failing_does_not_stop_the_others(self):
        self._follower("RSP-001", "token-a")
        self._follower("RSP-002", "token-b", OTHER_INSTALLATION_ID)
        self._reading(self.station, 165)
        self._reading(self.other_station, 165)

        calls = {"n": 0}

        def fail_first(messages):
            calls["n"] += 1
            if calls["n"] == 1:
                raise requests.ConnectionError("down")
            return ok_tickets(messages)["data"]

        with patch("api.push._post_batch", side_effect=fail_first):
            result = send_sensor_alerts()

        self.assertEqual(len(result.errors), 1)
        self.assertEqual(result.alerted_stations, 1)

    def test_the_alert_is_recorded_for_audit(self):
        self._follower("RSP-001", "token-a")
        self._reading(self.station, 165)

        capture = Capture()
        with patch("api.push._post_batch", side_effect=capture):
            send_sensor_alerts()

        alert = SensorAlert.objects.get()
        self.assertEqual(alert.station_code, "RSP-001")
        self.assertEqual(alert.level, "unhealthy")
        self.assertEqual(alert.recipients, 1)

    def test_a_dry_run_sends_nothing_and_records_nothing(self):
        self._follower("RSP-001", "token-a")
        self._reading(self.station, 165)

        capture = Capture()
        with patch("api.push._post_batch", side_effect=capture):
            result = send_sensor_alerts(dry_run=True)

        self.assertEqual(result.alerted_stations, 1)
        self.assertEqual(capture.messages, [])
        self.assertEqual(SensorAlert.objects.count(), 0)


class Capture:
    """Stands in for Expo, recording what would have been sent."""

    def __init__(self):
        self.messages: list[dict] = []

    def __call__(self, messages):
        self.messages.extend(messages)
        return ok_tickets(messages)["data"]

    def recipients(self) -> list[str]:
        return [message["to"] for message in self.messages]
