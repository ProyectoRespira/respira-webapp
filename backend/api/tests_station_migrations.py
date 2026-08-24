"""Tests for the station data migrations.

The station_status_seed.csv migration is what keeps the three manually
shut-down stations off across the handover from the dbt seed to the database,
so it is worth asserting rather than trusting a one-shot run.
"""

from django.test import TestCase

from .models import StationOverride


class SeedStationStatusOverridesTests(TestCase):
    """Migrations run when the test database is built, so the rows are there."""

    def test_the_three_shut_down_stations_are_present(self):
        codes = StationOverride.objects.filter(
            field=StationOverride.STATUS_FIELD,
            value=StationOverride.Status.INACTIVE,
        ).values_list("station_code", flat=True)

        self.assertEqual(
            sorted(codes),
            [
                "airelibre_d87553",
                "mades_open_ic08p0002",
                "mades_open_lvafyatdnok8ew",
            ],
        )

    def test_the_reason_from_the_csv_is_preserved(self):
        override = StationOverride.objects.get(station_code="airelibre_d87553")

        self.assertEqual(
            override.note,
            "FP-UNA SAN LORENZO: Station has inconsistent data and will not be "
            "used by Respira Paraguay",
        )
        # Unprocessed, so the first pipeline run after the switch picks them up.
        self.assertFalse(override.processed)
