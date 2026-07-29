"""Tests for the admin-owned station models (StationDetails, StationOverride).

These models are written by the backoffice, not by the dbt gold pipeline, so
what matters here is that the schema persists every documented field and that
the uniqueness rules hold at the database level.
"""

from datetime import date

from django.db import IntegrityError, transaction
from django.test import TestCase

from .models import Regions, StationDetails, Stations


class StationDetailsModelTests(TestCase):
    def setUp(self):
        self.region = Regions.objects.create(name="Gran Asunción", region_code="GA")
        self.station = Stations.objects.create(
            name="Respira: Villa Morra",
            region=self.region,
            latitude=-25.29,
            longitude=-57.57,
        )

    def test_details_are_reachable_from_the_station(self):
        details = StationDetails.objects.create(
            station=self.station, serial_number="SN-001"
        )

        self.station.refresh_from_db()
        self.assertEqual(self.station.details, details)
        self.assertEqual(details.station, self.station)

    def test_every_documented_field_persists(self):
        StationDetails.objects.create(
            station=self.station,
            serial_number="SN-001",
            sensor_type="PMS5003",
            model="Respira v2",
            city="Asunción",
            specific_location="Azara esq. Estados Unidos, poste municipal",
            locality="Villa Morra",
            environment_type="urban background",
            connectivity="wifi",
            power_source="grid",
            installation_date=date(2025, 3, 14),
            responsible="Equipo de campo",
            contact_info="campo@proyectorespira.net / +595 981 000000",
            notes="Requiere escalera para el mantenimiento.",
        )

        details = StationDetails.objects.get(station=self.station)
        self.assertEqual(details.serial_number, "SN-001")
        self.assertEqual(details.sensor_type, "PMS5003")
        self.assertEqual(details.model, "Respira v2")
        self.assertEqual(details.city, "Asunción")
        self.assertEqual(
            details.specific_location, "Azara esq. Estados Unidos, poste municipal"
        )
        self.assertEqual(details.locality, "Villa Morra")
        self.assertEqual(details.environment_type, "urban background")
        self.assertEqual(details.connectivity, "wifi")
        self.assertEqual(details.power_source, "grid")
        self.assertEqual(details.installation_date, date(2025, 3, 14))
        self.assertEqual(details.responsible, "Equipo de campo")
        self.assertEqual(
            details.contact_info, "campo@proyectorespira.net / +595 981 000000"
        )
        self.assertEqual(details.notes, "Requiere escalera para el mantenimiento.")

    def test_descriptive_fields_are_optional(self):
        # Operators load the spreadsheet data incrementally, so a record with
        # only the station attached must be valid.
        details = StationDetails.objects.create(station=self.station)

        self.assertEqual(details.serial_number, "")
        self.assertIsNone(details.installation_date)

    def test_one_details_record_per_station(self):
        StationDetails.objects.create(station=self.station)

        # The unique index backing the OneToOne is enforced in the database even
        # though the physical FOREIGN KEY is disabled (dbt recreates `stations`).
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                StationDetails.objects.create(station=self.station)

    def test_details_do_not_add_a_foreign_key_to_the_dbt_table(self):
        # A FOREIGN KEY against `stations` would break the dbt run that drops
        # and recreates it, so the relation must stay constraint-free.
        field = StationDetails._meta.get_field("station")
        self.assertFalse(field.db_constraint)
        self.assertTrue(field.one_to_one)

    def test_str_identifies_the_station(self):
        details = StationDetails.objects.create(station=self.station)

        self.assertEqual(str(details), "Details for Respira: Villa Morra")
