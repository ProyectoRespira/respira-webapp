"""Tests for the Station Administration modules in Django Admin.

Covers the backoffice that replaces the operational Google Spreadsheet and
station_status_seed.csv: the station changelist, the StationDetails inline on
the station page, and the StationOverride module.
"""

from django.contrib import admin
from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse

from .admin import StationDetailsInline
from .models import Regions, StationDetails, StationOverride, Stations

User = get_user_model()


class StationAdminTests(TestCase):
    def setUp(self):
        self.superuser = User.objects.create_superuser(
            email="admin@example.com", password="pw-Str0ng!42"
        )
        self.client.force_login(self.superuser)

        self.asuncion = Regions.objects.create(name="Gran Asunción", region_code="GA")
        self.encarnacion = Regions.objects.create(name="Encarnación", region_code="EN")

        self.station = Stations.objects.create(
            name="Respira: Villa Morra",
            region=self.asuncion,
            latitude=-25.29,
            longitude=-57.57,
            is_station_on=True,
        )
        self.other_station = Stations.objects.create(
            name="MADES: Costanera",
            region=self.encarnacion,
            latitude=-27.33,
            longitude=-55.87,
            is_station_on=False,
        )

        self.changelist_url = reverse("admin:api_stations_changelist")
        self.change_url = reverse("admin:api_stations_change", args=[self.station.pk])

    def _inline_payload(self, **details):
        """Management form for the StationDetails inline, plus its fields.

        The inline prefix is the OneToOne's related_name ("details").
        """
        payload = {
            "details-TOTAL_FORMS": "1",
            "details-INITIAL_FORMS": "0",
            "details-MIN_NUM_FORMS": "0",
            "details-MAX_NUM_FORMS": "1",
            "details-0-id": "",
            "details-0-station": str(self.station.pk),
        }
        payload.update({f"details-0-{key}": value for key, value in details.items()})
        return payload

    def test_changelist_renders_configured_columns(self):
        response = self.client.get(self.changelist_url)

        self.assertEqual(response.status_code, 200)
        # No action checkbox: stations cannot be deleted in bulk from here.
        self.assertEqual(
            list(response.context["cl"].list_display),
            ["name", "region", "is_station_on", "is_pattern_station"],
        )
        self.assertContains(response, "Respira: Villa Morra")
        # Regions render by name rather than as "Regions object (1)".
        self.assertContains(response, "Gran Asunción")

    def test_search_by_station_name(self):
        response = self.client.get(self.changelist_url, {"q": "Villa Morra"})

        results = list(response.context["cl"].result_list)
        self.assertEqual(results, [self.station])

    def test_filter_by_region(self):
        response = self.client.get(
            self.changelist_url, {"region__id__exact": self.encarnacion.pk}
        )

        results = list(response.context["cl"].result_list)
        self.assertEqual(results, [self.other_station])

    def test_filter_by_station_status(self):
        response = self.client.get(self.changelist_url, {"is_station_on__exact": "1"})

        results = list(response.context["cl"].result_list)
        self.assertEqual(results, [self.station])

    def test_station_page_renders_the_details_inline(self):
        response = self.client.get(self.change_url)

        self.assertEqual(response.status_code, 200)
        inlines = response.context["inline_admin_formsets"]
        self.assertEqual([inline.opts.model for inline in inlines], [StationDetails])
        self.assertIsInstance(inlines[0].opts, StationDetailsInline)
        self.assertIsInstance(inlines[0].opts, admin.StackedInline)

        # A station without details still gets a blank form, and every field of
        # the model is editable in it.
        for field in (
            "serial_number",
            "sensor_type",
            "model",
            "city",
            "specific_location",
            "locality",
            "environment_type",
            "connectivity",
            "power_source",
            "installation_date",
            "responsible",
            "contact_info",
            "notes",
        ):
            self.assertContains(response, f"details-0-{field}")

    def test_station_page_renders_existing_details(self):
        StationDetails.objects.create(station=self.station, serial_number="SN-001")

        response = self.client.get(self.change_url)

        self.assertContains(response, "SN-001")

    def test_details_can_be_created_from_the_station_page(self):
        response = self.client.post(
            self.change_url,
            self._inline_payload(
                serial_number="SN-001",
                sensor_type="PMS5003",
                model="Respira v2",
                city="Asunción",
                specific_location="Azara esq. Estados Unidos",
                locality="Villa Morra",
                environment_type="urban background",
                connectivity="wifi",
                power_source="grid",
                installation_date="2025-03-14",
                responsible="Equipo de campo",
                contact_info="campo@proyectorespira.net",
                notes="Requiere escalera.",
            ),
            follow=True,
        )

        self.assertEqual(response.status_code, 200)
        details = StationDetails.objects.get(station=self.station)
        self.assertEqual(details.serial_number, "SN-001")
        self.assertEqual(details.responsible, "Equipo de campo")

    def test_details_can_be_edited_from_the_station_page(self):
        details = StationDetails.objects.create(
            station=self.station, serial_number="SN-001"
        )
        payload = self._inline_payload(serial_number="SN-002")
        payload["details-INITIAL_FORMS"] = "1"
        payload["details-0-id"] = str(details.pk)

        self.client.post(self.change_url, payload, follow=True)

        details.refresh_from_db()
        self.assertEqual(details.serial_number, "SN-002")

    def test_station_fields_cannot_be_modified_through_the_admin(self):
        # `stations` is written by the dbt pipeline: even a superuser posting new
        # values for its fields must not change them.
        payload = self._inline_payload(serial_number="SN-001")
        payload.update(
            {
                "name": "Tampered name",
                "region": str(self.encarnacion.pk),
                "latitude": "0",
                "longitude": "0",
                "is_station_on": "on",
                "is_pattern_station": "on",
            }
        )

        self.client.post(self.change_url, payload, follow=True)

        self.station.refresh_from_db()
        self.assertEqual(self.station.name, "Respira: Villa Morra")
        self.assertEqual(self.station.region, self.asuncion)
        self.assertEqual(self.station.latitude, -25.29)
        self.assertEqual(self.station.longitude, -57.57)
        self.assertTrue(self.station.is_station_on)
        self.assertFalse(self.station.is_pattern_station)

    def test_stations_cannot_be_added_or_deleted(self):
        self.assertEqual(
            self.client.get(reverse("admin:api_stations_add")).status_code, 403
        )
        self.assertEqual(
            self.client.get(
                reverse("admin:api_stations_delete", args=[self.station.pk])
            ).status_code,
            403,
        )
        self.assertEqual(Stations.objects.count(), 2)


class StationOverrideAdminTests(TestCase):
    def setUp(self):
        self.superuser = User.objects.create_superuser(
            email="admin@example.com", password="pw-Str0ng!42"
        )
        self.client.force_login(self.superuser)

        self.override = StationOverride.objects.create(
            station_code="airelibre_d87553",
            field="status",
            value="inactive",
            note="FP-UNA San Lorenzo: inconsistent data",
        )
        self.changelist_url = reverse("admin:api_stationoverride_changelist")

    def test_changelist_renders_configured_columns(self):
        response = self.client.get(self.changelist_url)

        self.assertEqual(response.status_code, 200)
        columns = [field for field in response.context["cl"].list_display]
        self.assertEqual(
            columns,
            [
                "action_checkbox",
                "station_code",
                "field",
                "value",
                "change_date",
                "processed",
            ],
        )
        self.assertContains(response, "airelibre_d87553")

    def test_search_by_station_code(self):
        StationOverride.objects.create(
            station_code="mades_open_ic08p0002", field="status", value="inactive"
        )

        response = self.client.get(self.changelist_url, {"q": "airelibre"})

        self.assertEqual(list(response.context["cl"].result_list), [self.override])

    def test_filter_by_processed(self):
        processed = StationOverride.objects.create(
            station_code="mades_open_ic08p0002",
            field="status",
            value="inactive",
            processed=True,
        )

        response = self.client.get(self.changelist_url, {"processed__exact": "1"})

        self.assertEqual(list(response.context["cl"].result_list), [processed])

    def test_override_can_be_created_from_the_admin(self):
        self.client.post(
            reverse("admin:api_stationoverride_add"),
            {
                "station_code": "mades_open_lvafyatdnok8ew",
                "field": "status",
                "value": "inactive",
                "note": "Shut down by MADES request",
                "change_date_0": "2026-07-29",
                "change_date_1": "12:00:00",
            },
            follow=True,
        )

        created = StationOverride.objects.get(station_code="mades_open_lvafyatdnok8ew")
        self.assertEqual(created.value, "inactive")
        # `processed` is owned by the pipeline, so it starts false and is not
        # part of the form.
        self.assertFalse(created.processed)

    def test_processed_is_read_only(self):
        change_url = reverse(
            "admin:api_stationoverride_change", args=[self.override.pk]
        )

        self.client.post(
            change_url,
            {
                "station_code": self.override.station_code,
                "field": self.override.field,
                "value": self.override.value,
                "note": self.override.note,
                "change_date_0": "2026-07-29",
                "change_date_1": "12:00:00",
                "processed": "on",
            },
            follow=True,
        )

        self.override.refresh_from_db()
        self.assertFalse(self.override.processed)


class RegionsAdminTests(TestCase):
    def setUp(self):
        self.superuser = User.objects.create_superuser(
            email="admin@example.com", password="pw-Str0ng!42"
        )
        self.client.force_login(self.superuser)
        Regions.objects.create(name="Gran Asunción", region_code="GA")

    def test_changelist_renders(self):
        response = self.client.get(reverse("admin:api_regions_changelist"))

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Gran Asunción")

    def test_regions_stay_fully_read_only(self):
        # Unlike Stations, Regions has no editable inline, so it keeps the
        # ReadOnlyModelAdmin contract.
        self.assertEqual(
            self.client.get(reverse("admin:api_regions_add")).status_code, 403
        )

    def test_admin_index_lists_every_station_module(self):
        response = self.client.get(reverse("admin:index"))

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, reverse("admin:api_stations_changelist"))
        self.assertContains(response, reverse("admin:api_regions_changelist"))
        self.assertContains(response, reverse("admin:api_stationoverride_changelist"))
