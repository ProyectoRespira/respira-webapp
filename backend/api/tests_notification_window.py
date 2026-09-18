"""Tests for the AQI notification delivery window (api.models, api.push).

The property the feature exists for: nobody is woken at 03:00 over air they
cannot act on until morning, *and* nothing is lost by staying quiet. Those two
pull against each other, so most of these tests are about the second half —
what the first run after 06:00 does with a night that was held.

The mechanism is deliberately not a queue. `SensorAlertState.last_alerted_level`
records what followers *believe*, and quiet hours simply leave it alone: no
notification went out, so nothing changed about what they believe. The next run
inside the window then compares the reading it takes *then* against that same
state, which is what makes an episode still burning at 06:00 notify and one
that recovered at 04:00 stay silent — without either being special-cased.
"""

from datetime import datetime, time, timedelta, timezone as dt_timezone
from unittest.mock import patch
from zoneinfo import ZoneInfo

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Permission
from django.test import TestCase, override_settings
from django.urls import reverse
from django.utils import timezone

from .models import (
    DeviceFollower,
    DeviceInstallation,
    Institution,
    InstitutionAlertRule,
    InstitutionAlertRuleState,
    PushNotificationWindow,
    Regions,
    SensorAlertState,
    StationReadingsGold,
    Stations,
)
from .push import send_institution_alerts, send_sensor_alerts

User = get_user_model()

INSTALLATION_ID = "8f14e45f-ceea-467e-bd97-1a2b3c4d5e6f"

ASUNCION = ZoneInfo("America/Asuncion")


def ok_tickets(messages):
    """What `_post_batch` returns: the ticket list, already unwrapped.

    `_post_batch` is what these tests patch, and it hands back Expo's `data`
    array rather than the envelope around it.
    """
    return [{"status": "ok", "id": f"tk-{i}"} for i in range(len(messages))]


def at(hour, minute=0, *, day=15, month=7):
    """A moment on a local clock in Asunción, as an aware datetime.

    Built in the target zone rather than in UTC so the tests read as the hours
    an operator configures — the conversion is what is under test, not what the
    test should be doing arithmetic for.
    """
    return datetime(2026, month, day, hour, minute, tzinfo=ASUNCION)


class WindowBoundaryTests(TestCase):
    """Exactly which minutes are inside the configured window.

    QA validates the boundaries specifically, because an off-by-one here is a
    notification at 22:00 or silence at 06:00 — both of them the bug the
    feature was opened for, just an hour out.
    """

    def setUp(self):
        self.window = PushNotificationWindow.current()

    def test_the_default_window_is_the_agreed_schedule(self):
        self.assertTrue(self.window.is_enabled)
        self.assertEqual(self.window.start_time, time(6, 0))
        self.assertEqual(self.window.end_time, time(22, 0))
        self.assertEqual(self.window.timezone_name, "America/Asuncion")

    def test_midday_is_allowed(self):
        self.assertTrue(self.window.allows(at(13)))

    def test_the_start_of_the_window_is_inclusive(self):
        # 06:00 exactly must notify: it is the moment the night's held alerts
        # are meant to go out.
        self.assertTrue(self.window.allows(at(6, 0)))

    def test_the_minute_before_the_start_is_refused(self):
        self.assertFalse(self.window.allows(at(5, 59)))

    def test_the_end_of_the_window_is_exclusive(self):
        self.assertFalse(self.window.allows(at(22, 0)))

    def test_the_minute_before_the_end_is_allowed(self):
        self.assertTrue(self.window.allows(at(21, 59)))

    def test_the_small_hours_are_refused(self):
        self.assertFalse(self.window.allows(at(3)))
        self.assertFalse(self.window.allows(at(0)))
        self.assertFalse(self.window.allows(at(23, 30)))

    def test_disabling_the_restriction_allows_every_hour(self):
        self.window.is_enabled = False
        self.assertTrue(self.window.allows(at(3)))
        self.assertTrue(self.window.allows(at(22)))

    def test_a_window_crossing_midnight_is_read_as_the_night(self):
        """The inverted case, so a mis-set row behaves predictably.

        22:00–06:00 can only sensibly mean "overnight"; reading it as an empty
        window would silently stop every notification instead.
        """
        self.window.start_time = time(22, 0)
        self.window.end_time = time(6, 0)
        self.assertTrue(self.window.allows(at(23)))
        self.assertTrue(self.window.allows(at(2)))
        self.assertFalse(self.window.allows(at(13)))

    def test_equal_times_allow_nothing(self):
        # Degenerate, but it must not mean "always": an operator who set both
        # to 06:00 did not ask for notifications at every hour.
        self.window.start_time = time(6, 0)
        self.window.end_time = time(6, 0)
        self.assertFalse(self.window.allows(at(6)))
        self.assertFalse(self.window.allows(at(13)))


class WindowTimezoneTests(TestCase):
    """The window is local hours, not server hours.

    `settings.TIME_ZONE` is UTC on these hosts, and Paraguay is UTC-3. Read
    naively, a 06:00 window would fire at 03:00 in Asunción — the middle of the
    quiet period it exists to protect — so the stored zone is what makes the
    configuration mean what an operator reads it to mean.
    """

    def setUp(self):
        self.window = PushNotificationWindow.current()

    def test_the_hours_are_read_in_the_configured_zone(self):
        """The whole point of storing a zone.

        08:00 UTC is 05:00 in Asunción (UTC-3): inside a naively-read 06:00
        window, outside the real one. A server reading its own UTC clock would
        notify here — an hour into the quiet period.
        """
        moment = datetime(2026, 7, 15, 8, 0, tzinfo=dt_timezone.utc)
        self.assertEqual(moment.astimezone(ASUNCION).hour, 5)
        self.assertFalse(self.window.allows(moment))

    def test_a_utc_moment_inside_the_local_window_is_allowed(self):
        # 15:00 UTC is 12:00 local.
        moment = datetime(2026, 7, 15, 15, 0, tzinfo=dt_timezone.utc)
        self.assertEqual(moment.astimezone(ASUNCION).hour, 12)
        self.assertTrue(self.window.allows(moment))

    def test_the_quiet_period_in_utc_terms(self):
        """Spelled out, because this is what the logs will show.

        With UTC-3, the local 22:00–06:00 quiet period is 01:00–09:00 UTC. An
        operator reading `journalctl` sees UTC timestamps, so this is the
        mapping they need when checking whether a held run was correct.
        """
        utc = dt_timezone.utc
        self.assertFalse(self.window.allows(datetime(2026, 7, 15, 1, 0, tzinfo=utc)))
        self.assertFalse(self.window.allows(datetime(2026, 7, 15, 8, 59, tzinfo=utc)))
        self.assertTrue(self.window.allows(datetime(2026, 7, 15, 9, 0, tzinfo=utc)))
        self.assertTrue(self.window.allows(datetime(2026, 7, 15, 0, 59, tzinfo=utc)))

    def test_an_unknown_zone_falls_back_instead_of_crashing(self):
        """A typo must not take the alerting down with it."""
        self.window.timezone_name = "Mars/Olympus_Mons"
        # Still answers, and still applies *a* window rather than notifying at
        # every hour.
        self.assertIsNotNone(self.window.tzinfo())
        self.assertFalse(
            self.window.allows(datetime(2026, 7, 15, 3, 0, tzinfo=dt_timezone.utc))
        )

    def test_the_offset_is_resolved_per_call_not_frozen(self):
        """Paraguay abolished DST in 2024 and now sits at UTC-3 year round.

        So there is no seasonal shift to test today — but the zone is resolved
        through `ZoneInfo` on every call rather than baked into a stored offset,
        which is what would keep this correct if Paraguay reintroduced DST or
        the sensors moved country. Asserting the offset is uniform is the
        honest version of that: it documents *why* the naive reading happens to
        look fine here, so nobody "simplifies" this to a fixed -3.
        """
        january = datetime(2026, 1, 15, 12, 0, tzinfo=dt_timezone.utc)
        july = datetime(2026, 7, 15, 12, 0, tzinfo=dt_timezone.utc)

        self.assertEqual(
            january.astimezone(ASUNCION).utcoffset(),
            july.astimezone(ASUNCION).utcoffset(),
        )
        # Both land at 09:00 local, inside the window.
        self.assertTrue(self.window.allows(january))
        self.assertTrue(self.window.allows(july))


class WindowSingletonTests(TestCase):
    """One row, so "which window is the sender using?" has one answer."""

    def test_current_creates_the_row_on_first_read(self):
        PushNotificationWindow.objects.all().delete()
        window = PushNotificationWindow.current()
        self.assertIsNotNone(window.pk)
        self.assertEqual(PushNotificationWindow.objects.count(), 1)

    def test_current_returns_the_same_row_every_time(self):
        first = PushNotificationWindow.current()
        first.start_time = time(7, 30)
        first.save()

        second = PushNotificationWindow.current()
        self.assertEqual(second.pk, first.pk)
        self.assertEqual(second.start_time, time(7, 30))
        self.assertEqual(PushNotificationWindow.objects.count(), 1)


@override_settings(SENSOR_ALERTS_ENABLED=True)
class SensorAlertsWindowTests(TestCase):
    """The six scenarios QA validates, driven through the real sender."""

    def setUp(self):
        self.region = Regions.seed_for_tests(name="Gran Asunción", region_code="GA")
        self.station = Stations.seed_for_tests(
            name="Respira: Concepción",
            region=self.region,
            station_code="RSP-001",
            is_station_on=True,
        )
        installation, _ = DeviceInstallation.register(
            INSTALLATION_ID, push_token="token-a"
        )
        DeviceFollower.objects.create(installation=installation, station_code="RSP-001")
        self.window = PushNotificationWindow.current()

    def _reading(self, aqi, *, when=None):
        """Adds a reading, newer than every one before it.

        Appended rather than replacing, because that is what the pipeline does
        — `station_readings_gold` accumulates and `_latest_level` takes the
        most recent `date_utc`. These tests walk one station through a night,
        so each new reading has to out-date the last for the sender to see it.
        """
        self._clock = getattr(self, "_clock", timezone.now())
        self._clock += timedelta(minutes=30)
        return StationReadingsGold.seed_for_tests(
            station=self.station, date_utc=when or self._clock, aqi_pm2_5=aqi
        )

    def _run_at(self, moment):
        """One sender run, with the clock stopped at ``moment``.

        Only `timezone.now` is moved, not the readings' timestamps: the window
        is judged against the wall clock while the reading stays whatever the
        pipeline last wrote, which is exactly the real arrangement.
        """
        with patch("django.utils.timezone.now", return_value=moment):
            with patch("api.push._post_batch", side_effect=ok_tickets) as post:
                result = send_sensor_alerts()
        return result, post

    def _state(self):
        return SensorAlertState.objects.get(station_code="RSP-001")

    # --- 1) alert triggered within the allowed window ----------------------

    def test_an_alert_inside_the_window_is_delivered(self):
        self._reading(165)
        result, post = self._run_at(at(13))

        self.assertEqual(result.alerted_stations, 1)
        self.assertEqual(result.deferred_stations, 0)
        post.assert_called_once()
        self.assertEqual(self._state().last_alerted_level, "unhealthy")

    # --- 2) alert triggered during quiet hours -----------------------------

    def test_an_alert_during_quiet_hours_is_not_delivered(self):
        self._reading(165)
        result, post = self._run_at(at(3))

        post.assert_not_called()
        self.assertEqual(result.alerted_stations, 0)
        self.assertEqual(result.deferred_stations, 1)

    def test_a_held_alert_does_not_count_as_notified(self):
        """The heart of "must not simply be discarded".

        If quiet hours advanced `last_alerted_level`, the morning run would
        compare the same air against "followers already know" and stay silent
        forever — the alert would be lost, not deferred.
        """
        self._reading(165)
        self._run_at(at(3))

        self.assertEqual(self._state().last_alerted_level, "")
        # What was *read* is still recorded; only what was announced is not.
        self.assertEqual(self._state().last_level, "unhealthy")

    # --- 3) overnight alert still active at 06:00 --------------------------

    def test_an_overnight_alert_still_burning_notifies_when_the_window_opens(self):
        self._reading(165)
        _, held = self._run_at(at(3))
        held.assert_not_called()

        # Morning: the air has not improved.
        self._reading(170)
        result, post = self._run_at(at(6, 0))

        post.assert_called_once()
        self.assertEqual(result.alerted_stations, 1)
        self.assertEqual(self._state().last_alerted_level, "unhealthy")

    def test_the_morning_notification_describes_the_mornings_air(self):
        """Not a replay of the night's reading — the AQI people act on is now.

        The night hit `veryUnhealthy`; by 06:00 it has eased to `unhealthy`.
        The notification must be about the latter, because that is the air
        somebody deciding whether to go outside is deciding about.
        """
        self._reading(250)  # veryUnhealthy
        self._run_at(at(2))

        self._reading(165)  # unhealthy
        _, post = self._run_at(at(6, 30))

        (messages,) = [call.args[0] for call in post.call_args_list]
        self.assertEqual(messages[0]["data"]["level"], "unhealthy")
        self.assertEqual(messages[0]["data"]["aqi"], 165)

    # --- 4) overnight alert resolved before 06:00 --------------------------

    def test_an_overnight_alert_that_recovered_sends_nothing_in_the_morning(self):
        """No stale warning, and no all-clear for a warning never sent."""
        self._reading(165)
        self._run_at(at(3))

        # Recovered before the window opened.
        self._reading(30)
        result, post = self._run_at(at(6, 30))

        post.assert_not_called()
        self.assertEqual(result.alerted_stations, 0)
        self.assertEqual(result.recovered_stations, 0)
        self.assertEqual(result.deferred_stations, 0)

    # --- 5) the improvement notification ----------------------------------

    def test_an_improvement_inside_the_window_is_delivered(self):
        self._reading(250)
        self._run_at(at(13))
        self.assertEqual(self._state().last_alerted_level, "veryUnhealthy")

        self._reading(30)
        result, post = self._run_at(at(15))

        post.assert_called_once()
        self.assertEqual(result.recovered_stations, 1)

    def test_an_improvement_during_quiet_hours_waits_for_the_window(self):
        """An all-clear is not urgent enough to wake somebody for either."""
        self._reading(250)
        self._run_at(at(20))
        self.assertEqual(self._state().last_alerted_level, "veryUnhealthy")

        # Improves overnight.
        self._reading(30)
        result, post = self._run_at(at(2))

        post.assert_not_called()
        self.assertEqual(result.deferred_stations, 1)
        # The episode is still open, which is what makes the morning run
        # deliver the all-clear rather than forgetting it.
        self.assertEqual(self._state().last_alerted_level, "veryUnhealthy")

        _, morning = self._run_at(at(6, 30))
        morning.assert_called_once()

    # --- 6) boundaries, through the sender ---------------------------------

    def test_an_alert_at_the_closing_hour_is_held(self):
        self._reading(165)
        _, post = self._run_at(at(22, 0))
        post.assert_not_called()

    def test_an_alert_a_minute_before_closing_is_sent(self):
        self._reading(165)
        _, post = self._run_at(at(21, 59))
        post.assert_called_once()

    # --- the restriction being off ----------------------------------------

    def test_disabling_the_restriction_notifies_at_any_hour(self):
        self.window.is_enabled = False
        self.window.save()

        self._reading(165)
        result, post = self._run_at(at(3))

        post.assert_called_once()
        self.assertEqual(result.alerted_stations, 1)
        self.assertEqual(result.deferred_stations, 0)

    def test_the_window_is_read_per_run_not_cached(self):
        """Changing the hours in the admin must take effect on the next run."""
        self._reading(165)
        _, post = self._run_at(at(3))
        post.assert_not_called()

        self.window.start_time = time(0, 0)
        self.window.end_time = time(23, 59)
        self.window.save()

        _, post = self._run_at(at(3))
        post.assert_called_once()

    # --- duplicate protection still holds ---------------------------------

    def test_the_same_level_still_notifies_only_once(self):
        """The existing duplicate guard is untouched by the window."""
        self._reading(165)
        _, first = self._run_at(at(13))
        first.assert_called_once()

        self._reading(166)
        _, second = self._run_at(at(14))
        second.assert_not_called()

    def test_a_held_night_does_not_notify_twice_in_the_morning(self):
        """Two quiet-hours runs, then one morning run: one notification.

        Worth pinning because the night leaves state deliberately unchanged —
        the thing that must not turn into "every held run notifies at 06:00".
        """
        self._reading(165)
        self._run_at(at(1))
        self._run_at(at(4))

        _, morning = self._run_at(at(6, 30))
        self.assertEqual(morning.call_count, 1)

        # And the run after that is silent, as for any delivered alert.
        _, later = self._run_at(at(7, 30))
        later.assert_not_called()

    # --- the dry run tells the truth --------------------------------------

    def test_a_dry_run_during_quiet_hours_reports_a_hold_not_an_alert(self):
        self._reading(165)
        with patch("django.utils.timezone.now", return_value=at(3)):
            result = send_sensor_alerts(dry_run=True)

        self.assertEqual(result.alerted_stations, 0)
        self.assertEqual(result.deferred_stations, 1)

    def test_a_dry_run_inside_the_window_reports_the_alert(self):
        self._reading(165)
        with patch("django.utils.timezone.now", return_value=at(13)):
            result = send_sensor_alerts(dry_run=True)

        self.assertEqual(result.alerted_stations, 1)
        self.assertEqual(result.deferred_stations, 0)


@override_settings(SENSOR_ALERTS_ENABLED=True)
class InstitutionAlertsWindowTests(TestCase):
    """The institutional rules obey the same window, and rearm regardless."""

    def setUp(self):
        self.region = Regions.seed_for_tests(name="Gran Asunción", region_code="GA")
        self.station = Stations.seed_for_tests(
            name="Respira: Vallemí",
            region=self.region,
            station_code="RSP-001",
            is_station_on=True,
        )
        installation, _ = DeviceInstallation.register(
            INSTALLATION_ID, push_token="token-a"
        )
        DeviceFollower.objects.create(installation=installation, station_code="RSP-001")

        self.institution = Institution.objects.create(legal_name="Colegio San José")
        self.rule = InstitutionAlertRule.objects.create(
            institution=self.institution,
            station=self.station,
            threshold=100,
            push_title="Aire insalubre",
            push_body="El sensor {station} superó el umbral.",
        )

    def _reading(self, aqi):
        """Appended and newer than the last, as in `SensorAlertsWindowTests`."""
        self._clock = getattr(self, "_clock", timezone.now())
        self._clock += timedelta(minutes=30)
        return StationReadingsGold.seed_for_tests(
            station=self.station, date_utc=self._clock, aqi_pm2_5=aqi
        )

    def _run_at(self, moment):
        with patch("django.utils.timezone.now", return_value=moment):
            with patch("api.push._post_batch", side_effect=ok_tickets) as post:
                result = send_institution_alerts()
        return result, post

    def _state(self):
        return InstitutionAlertRuleState.objects.get(rule=self.rule)

    def test_a_crossing_inside_the_window_fires(self):
        self._reading(150)
        result, post = self._run_at(at(13))

        post.assert_called_once()
        self.assertEqual(result.alerted_stations, 1)
        self.assertTrue(self._state().is_firing)

    def test_a_crossing_during_quiet_hours_is_held(self):
        self._reading(150)
        result, post = self._run_at(at(3))

        post.assert_not_called()
        self.assertEqual(result.deferred_stations, 1)
        # Not firing, so the crossing is still outstanding rather than
        # suppressed — this is what the morning run re-judges.
        self.assertFalse(self._state().is_firing)

    def test_a_held_crossing_still_over_the_threshold_fires_in_the_morning(self):
        self._reading(150)
        self._run_at(at(3))

        self._reading(155)
        result, post = self._run_at(at(6, 30))

        post.assert_called_once()
        self.assertEqual(result.alerted_stations, 1)
        self.assertTrue(self._state().is_firing)

    def test_a_held_crossing_that_fell_back_does_not_fire(self):
        """No stale institutional alert either."""
        self._reading(150)
        self._run_at(at(3))

        self._reading(20)
        result, post = self._run_at(at(6, 30))

        post.assert_not_called()
        self.assertEqual(result.alerted_stations, 0)
        self.assertFalse(self._state().is_firing)

    def test_rearming_is_not_deferred(self):
        """It sends nothing, and holding it would suppress the next crossing.

        A rule left marked as firing over air that has already recovered would
        treat the *next* genuine crossing as a continuation and stay silent.
        """
        self._reading(150)
        self._run_at(at(13))
        self.assertTrue(self._state().is_firing)

        # Falls back below the rearm threshold, overnight.
        self._reading(10)
        _, post = self._run_at(at(3))

        post.assert_not_called()
        self.assertFalse(self._state().is_firing)

        # So a fresh crossing in the morning fires, rather than being read as
        # the same episode continuing.
        self._reading(150)
        _, morning = self._run_at(at(7))
        morning.assert_called_once()


@override_settings(SENSOR_ALERTS_ENABLED=True)
class CatchUpIgnoresWindowTests(TestCase):
    """A follow is a request, not a scheduled interruption.

    Gating the catch-up would also lose it rather than defer it: that path
    advances no state, so no later run would pick it up.
    """

    def setUp(self):
        self.region = Regions.seed_for_tests(name="Gran Asunción", region_code="GA")
        self.station = Stations.seed_for_tests(
            name="Respira: Vallemí",
            region=self.region,
            station_code="RSP-001",
            is_station_on=True,
        )
        StationReadingsGold.seed_for_tests(
            station=self.station, date_utc=timezone.now(), aqi_pm2_5=165
        )

    def test_a_new_follower_is_caught_up_even_at_night(self):
        from .push import catch_up_follower

        installation, _ = DeviceInstallation.register(
            INSTALLATION_ID, push_token="token-a"
        )

        with patch("django.utils.timezone.now", return_value=at(3)):
            with patch("api.push._post_batch", side_effect=ok_tickets) as post:
                accepted = catch_up_follower(installation, self.station)

        self.assertTrue(accepted)
        post.assert_called_once()


class WindowAdminTests(TestCase):
    """The configuration is editable in the admin, and only there."""

    def setUp(self):
        self.user = User.objects.create_user(
            "operator", password="x", is_staff=True, is_superuser=False
        )
        for codename in (
            "view_pushnotificationwindow",
            "change_pushnotificationwindow",
        ):
            self.user.user_permissions.add(Permission.objects.get(codename=codename))
        self.client.force_login(self.user)
        self.window = PushNotificationWindow.current()

    def test_the_hours_can_be_changed_without_a_deploy(self):
        """The acceptance criterion, exercised through the admin form."""
        url = reverse("admin:api_pushnotificationwindow_change", args=[self.window.pk])
        response = self.client.post(
            url,
            {
                "is_enabled": "on",
                "start_time": "07:30:00",
                "end_time": "21:00:00",
                "timezone_name": "America/Asuncion",
            },
        )
        self.assertEqual(response.status_code, 302)

        self.window.refresh_from_db()
        self.assertEqual(self.window.start_time, time(7, 30))
        self.assertEqual(self.window.end_time, time(21, 0))
        # And the sender sees it, since it reads the row per run.
        self.assertFalse(PushNotificationWindow.current().allows(at(7, 0)))
        self.assertTrue(PushNotificationWindow.current().allows(at(8, 0)))

    def test_the_restriction_can_be_switched_off_from_the_admin(self):
        url = reverse("admin:api_pushnotificationwindow_change", args=[self.window.pk])
        self.client.post(
            url,
            {
                "start_time": "06:00:00",
                "end_time": "22:00:00",
                "timezone_name": "America/Asuncion",
            },
        )

        self.window.refresh_from_db()
        self.assertFalse(self.window.is_enabled)
        self.assertTrue(self.window.allows(at(3)))

    def test_the_changelist_opens_the_single_row(self):
        # A settings screen, not a list of one.
        response = self.client.get(
            reverse("admin:api_pushnotificationwindow_changelist")
        )
        self.assertEqual(response.status_code, 302)
        self.assertIn(str(self.window.pk), response["Location"])

    def test_a_second_window_cannot_be_added(self):
        response = self.client.get(reverse("admin:api_pushnotificationwindow_add"))
        self.assertEqual(response.status_code, 403)

    def test_the_window_cannot_be_deleted(self):
        """Deleting is not a way to disable: `current()` would recreate it."""
        response = self.client.post(
            reverse("admin:api_pushnotificationwindow_delete", args=[self.window.pk]),
            {"post": "yes"},
        )
        self.assertIn(response.status_code, (403, 302))
        self.assertTrue(
            PushNotificationWindow.objects.filter(pk=self.window.pk).exists()
        )
