"""Tests for the hourly PM series, GET /api/institution/readings/ (#322).

What is locked in: the series is laid out on the clock (one point per hour of
the period, gaps as ``null``), timestamps are rendered in Paraguayan time with
an explicit ``-03:00``, and the sensor is resolved against the caller's own
contracts exactly like the dashboard — another institution's sensor is a 404.

The clock is frozen per test (``django.utils.timezone.now``) so the window is
deterministic; readings are seeded at aware UTC instants, which is what the
gold ``date_localtime`` column (a ``timestamptz``) holds.
"""

from datetime import UTC, date, datetime, timedelta
from unittest import mock

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APIClient, APITestCase

from .models import (
    Institution,
    InstitutionContract,
    InstitutionRole,
    InstitutionUser,
    Regions,
    StationReadingsGold,
    Stations,
)

User = get_user_model()

# 12:30 in Asunción on a November day; the current hour starts at 15:00 UTC.
NOW = datetime(2026, 11, 18, 15, 30, tzinfo=UTC)
CURRENT_HOUR = datetime(2026, 11, 18, 15, 0, tzinfo=UTC)


class InstitutionReadingsTests(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.url = reverse("institution-readings")

        clock = mock.patch("django.utils.timezone.now", return_value=NOW)
        clock.start()
        self.addCleanup(clock.stop)

        region = Regions.seed_for_tests(name="Gran Asuncion", region_code="GA")
        self.institution = Institution.objects.create(legal_name="Industria Ejemplo")
        # Created B-first so "first by name" (A) differs from "first created".
        self.station_b = Stations.seed_for_tests(name="Respira: B", region=region)
        self.station_a = Stations.seed_for_tests(name="Respira: A", region=region)
        for station in (self.station_a, self.station_b):
            InstitutionContract.objects.create(
                institution=self.institution,
                station=station,
                contract_status=InstitutionContract.ContractStatus.ACTIVE,
                start_date=date(2026, 1, 1),
            )
        self.user = User.objects.create_user(
            username="admin@industria.example",
            email="admin@industria.example",
            password="S3ed!Pass99",
        )
        InstitutionUser.objects.create(user=self.user, institution=self.institution)

        self.other_institution = Institution.objects.create(legal_name="Colegio Ajeno")
        self.foreign_station = Stations.seed_for_tests(
            name="Respira: Ajena", region=region
        )
        InstitutionContract.objects.create(
            institution=self.other_institution,
            station=self.foreign_station,
            contract_status=InstitutionContract.ContractStatus.ACTIVE,
            start_date=date(2026, 1, 1),
        )
        StationReadingsGold.seed_for_tests(
            station=self.foreign_station, date_utc=CURRENT_HOUR, pm2_5=99.0, pm10=99.0
        )

    def get(self, **params):
        self.client.force_authenticate(self.user)
        return self.client.get(self.url, params)

    def seed(self, station, when, pm25=None, pm10=None):
        return StationReadingsGold.seed_for_tests(
            station=station, date_utc=when, pm2_5=pm25, pm10=pm10
        )

    # --- Shape and periods -----------------------------------------------

    def test_default_period_is_seven_days_of_hourly_points(self):
        response = self.get()

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(set(body), {"station", "period", "readings"})
        self.assertEqual(body["period"], "7d")
        self.assertEqual(body["station"], self.station_a.id)
        self.assertEqual(len(body["readings"]), 7 * 24)
        self.assertEqual(set(body["readings"][0]), {"ts", "pm25", "pm10"})

    def test_each_period_spans_its_number_of_hours(self):
        for period, hours in (("24h", 24), ("7d", 168), ("30d", 720)):
            with self.subTest(period=period):
                body = self.get(period=period).json()
                self.assertEqual(body["period"], period)
                self.assertEqual(len(body["readings"]), hours)

    def test_an_unknown_period_is_a_400(self):
        for period in ("1y", "7D", "week", "0"):
            with self.subTest(period=period):
                response = self.get(period=period)
                self.assertEqual(response.status_code, 400)
                self.assertIn("period", response.json())

    def test_an_empty_period_falls_back_to_the_default(self):
        self.assertEqual(self.get(period="").json()["period"], "7d")

    def test_series_is_oldest_first_and_ends_at_the_current_hour(self):
        readings = self.get(period="24h").json()["readings"]

        self.assertEqual(readings[-1]["ts"], "2026-11-18T12:00:00-03:00")
        self.assertEqual(readings[0]["ts"], "2026-11-17T13:00:00-03:00")
        stamps = [datetime.fromisoformat(point["ts"]) for point in readings]
        for earlier, later in zip(stamps, stamps[1:]):
            self.assertEqual(later - earlier, timedelta(hours=1))

    # --- Time zone -------------------------------------------------------

    def test_timestamps_carry_an_explicit_minus_three_offset(self):
        readings = self.get(period="24h").json()["readings"]
        for point in readings:
            self.assertTrue(point["ts"].endswith("-03:00"), point["ts"])

    def test_a_reading_is_placed_at_its_local_hour(self):
        # 03:00 UTC is midnight in Asunción.
        self.seed(self.station_a, datetime(2026, 11, 18, 3, tzinfo=UTC), 6.1, 18.0)

        readings = self.get(period="24h").json()["readings"]
        point = next(p for p in readings if p["ts"] == "2026-11-18T00:00:00-03:00")

        self.assertEqual(point["pm25"], 6.1)
        self.assertEqual(point["pm10"], 18.0)

    def test_the_offset_is_minus_three_in_winter_too(self):
        # Paraguay dropped DST in 2024: July is UTC-3 as well, not UTC-4.
        july = datetime(2026, 7, 15, 15, 30, tzinfo=UTC)
        with mock.patch("django.utils.timezone.now", return_value=july):
            readings = self.get(period="24h").json()["readings"]

        self.assertEqual(readings[-1]["ts"], "2026-07-15T12:00:00-03:00")

    # --- Gaps --------------------------------------------------------------

    def test_hours_without_a_reading_are_null(self):
        self.seed(self.station_a, CURRENT_HOUR - timedelta(hours=1), 10.0, 20.0)
        self.seed(self.station_a, CURRENT_HOUR - timedelta(hours=3), 30.0, 40.0)

        readings = self.get(period="24h").json()["readings"]

        self.assertEqual(
            readings[-1],
            {"ts": "2026-11-18T12:00:00-03:00", "pm25": None, "pm10": None},
        )
        self.assertEqual(readings[-2]["pm25"], 10.0)
        self.assertEqual(
            readings[-3],
            {"ts": "2026-11-18T10:00:00-03:00", "pm25": None, "pm10": None},
        )
        self.assertEqual(readings[-4]["pm10"], 40.0)
        self.assertEqual(sum(1 for p in readings if p["pm25"] is not None), 2)

    def test_a_station_without_readings_gets_a_full_series_of_nulls(self):
        readings = self.get(period="24h").json()["readings"]

        self.assertEqual(len(readings), 24)
        self.assertTrue(all(p["pm25"] is None and p["pm10"] is None for p in readings))

    def test_one_missing_pollutant_is_null_on_its_own(self):
        self.seed(self.station_a, CURRENT_HOUR, pm25=7.5, pm10=None)

        point = self.get(period="24h").json()["readings"][-1]

        self.assertEqual(point["pm25"], 7.5)
        self.assertIsNone(point["pm10"])

    def test_readings_outside_the_window_are_left_out(self):
        self.seed(self.station_a, CURRENT_HOUR - timedelta(hours=24), 1.0, 1.0)
        self.seed(self.station_a, CURRENT_HOUR + timedelta(hours=1), 2.0, 2.0)
        self.seed(self.station_a, CURRENT_HOUR - timedelta(hours=23), 3.0, 3.0)

        readings = self.get(period="24h").json()["readings"]

        self.assertEqual([p["pm25"] for p in readings if p["pm25"] is not None], [3.0])
        self.assertEqual(readings[0]["pm25"], 3.0)

    # --- Station resolution and isolation --------------------------------

    def test_station_selects_one_of_the_own_sensors(self):
        self.seed(self.station_a, CURRENT_HOUR, 1.0, 1.0)
        self.seed(self.station_b, CURRENT_HOUR, 2.0, 2.0)

        body = self.get(station=self.station_b.id, period="24h").json()

        self.assertEqual(body["station"], self.station_b.id)
        self.assertEqual(body["readings"][-1]["pm25"], 2.0)

    def test_another_institutions_station_is_a_404(self):
        response = self.get(station=self.foreign_station.id)

        self.assertEqual(response.status_code, 404)
        self.assertNotIn("99", response.content.decode())

    def test_an_unknown_or_malformed_station_is_a_404(self):
        for station in ("999999", "abc", "1.5"):
            with self.subTest(station=station):
                self.assertEqual(self.get(station=station).status_code, 404)

    def test_an_institution_without_a_sensor_gets_a_404(self):
        lonely = Institution.objects.create(legal_name="Sin Sensor")
        contact = User.objects.create_user(
            username="sin@sensor.example",
            email="sin@sensor.example",
            password="S3ed!Pass99",
        )
        InstitutionUser.objects.create(user=contact, institution=lonely)
        self.client.force_authenticate(contact)

        self.assertEqual(self.client.get(self.url).status_code, 404)

    def test_unauthenticated_is_rejected(self):
        self.assertIn(self.client.get(self.url).status_code, (401, 403))

    def test_a_user_without_an_institution_is_forbidden(self):
        outsider = User.objects.create_user(
            username="nobody@example.com",
            email="nobody@example.com",
            password="S3ed!Pass99",
        )
        self.client.force_authenticate(outsider)

        self.assertEqual(self.client.get(self.url).status_code, 403)

    def test_a_member_can_read_the_series(self):
        member = User.objects.create_user(
            username="member@industria.example",
            email="member@industria.example",
            password="S3ed!Pass99",
        )
        InstitutionUser.objects.create(
            user=member, institution=self.institution, role=InstitutionRole.MEMBER
        )
        self.client.force_authenticate(member)

        self.assertEqual(self.client.get(self.url).status_code, 200)
