"""Tests for the admin-editable MADES PM limits (``MadesPmLimits``).

They used to be ``settings.MADES_PM_LIMITS``. What has to hold now:

* migration 0032 seeds exactly what the setting held, so ``/me`` answered the
  same the moment the table replaced it;
* an edit in the admin reaches ``/me`` with the same JSON shape — whole
  numbers as integers, unconfirmed limits as ``null``;
* the table is a singleton: no second row, no delete, from the admin or not;
* a missing row degrades to every limit unconfirmed instead of a 500.
"""

from datetime import date
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.db import IntegrityError, connection, transaction
from django.test import TestCase
from django.test.utils import CaptureQueriesContext
from django.urls import reverse
from rest_framework.test import APIClient

from .models import (
    Institution,
    InstitutionContract,
    InstitutionUser,
    MadesPmLimits,
    Regions,
    Stations,
)

User = get_user_model()

SEEDED = {
    "pm25": {"h24": None, "annual": 40},
    "pm10": {"h24": 150, "annual": None},
}
ALL_NULL = {
    "pm25": {"h24": None, "annual": None},
    "pm10": {"h24": None, "annual": None},
}


def limits_row():
    return MadesPmLimits.objects.get(pk=MadesPmLimits.SINGLETON_ID)


class MadesLimitsMeTestCase(TestCase):
    """A logged-in institutional user, to read ``/me`` as the panel does."""

    def setUp(self):
        self.api = APIClient()
        region = Regions.seed_for_tests(name="Gran Asuncion", region_code="GA")
        institution = Institution.objects.create(legal_name="Industria Ejemplo")
        station = Stations.seed_for_tests(name="Respira: Planta", region=region)
        InstitutionContract.objects.create(
            institution=institution, station=station, start_date=date(2026, 1, 1)
        )
        user = User.objects.create_user(
            username="admin@industria.example",
            email="admin@industria.example",
            password="S3ed!Pass99",
        )
        InstitutionUser.objects.create(user=user, institution=institution)
        self.api.force_authenticate(user)

    def me_limits(self):
        response = self.api.get(reverse("institution-me"))
        self.assertEqual(response.status_code, 200)
        return response.json()["limits"]


class SeededLimitsTests(MadesLimitsMeTestCase):
    def test_the_migration_seeds_the_values_the_setting_held(self):
        row = limits_row()

        self.assertIsNone(row.pm25_h24)
        self.assertEqual(row.pm25_annual, Decimal("40"))
        self.assertEqual(row.pm10_h24, Decimal("150"))
        self.assertIsNone(row.pm10_annual)

    def test_me_serves_the_seed_with_whole_numbers_as_integers(self):
        limits = self.me_limits()

        self.assertEqual(limits, SEEDED)
        # `150 == 150.0` in Python, so assert the type: the JSON must say 150.
        self.assertIs(type(limits["pm10"]["h24"]), int)
        self.assertIs(type(limits["pm25"]["annual"]), int)

    def test_a_fractional_limit_keeps_its_decimal(self):
        MadesPmLimits.objects.update(pm25_h24=Decimal("12.5"))

        self.assertEqual(self.me_limits()["pm25"]["h24"], 12.5)

    def test_reading_the_limits_is_a_single_query(self):
        with CaptureQueriesContext(connection) as queries:
            MadesPmLimits.current_payload()

        self.assertEqual(len(queries), 1)


class MissingRowTests(MadesLimitsMeTestCase):
    def test_me_serves_every_limit_as_unconfirmed_without_the_row(self):
        MadesPmLimits.objects.all().delete()

        with self.assertLogs("api.models", level="WARNING"):
            limits = self.me_limits()

        self.assertEqual(limits, ALL_NULL)

    def test_reading_without_the_row_does_not_recreate_it(self):
        # Recreating would mean inventing values; the admin's "add" does it.
        MadesPmLimits.objects.all().delete()

        with self.assertLogs("api.models", level="WARNING"):
            MadesPmLimits.current_payload()

        self.assertFalse(MadesPmLimits.objects.exists())


class SingletonModelTests(TestCase):
    def test_a_new_instance_cannot_be_saved_next_to_the_row(self):
        # Its id defaults to 1, which the seeded row already holds.
        with self.assertRaises(IntegrityError), transaction.atomic():
            MadesPmLimits(pm10_h24=Decimal("100")).save()

        self.assertEqual(limits_row().pm10_h24, Decimal("150"))

    def test_the_table_refuses_any_other_id(self):
        with self.assertRaises(IntegrityError), transaction.atomic():
            MadesPmLimits.objects.create(id=2)

        self.assertEqual(MadesPmLimits.objects.count(), 1)


class MadesLimitsAdminTests(MadesLimitsMeTestCase):
    def setUp(self):
        super().setUp()
        self.superuser = User.objects.create_superuser("operator@respira.example", "x")
        self.client.force_login(self.superuser)
        self.change_url = reverse(
            "admin:api_madespmlimits_change", args=[MadesPmLimits.SINGLETON_ID]
        )

    def post_limits(self, url=None, **values):
        data = {"pm25_h24": "", "pm25_annual": "", "pm10_h24": "", "pm10_annual": ""}
        data.update(values)
        return self.client.post(url or self.change_url, data)

    def test_an_edit_in_the_admin_reaches_me(self):
        response = self.post_limits(
            pm25_h24="15", pm25_annual="40", pm10_h24="150", pm10_annual="50"
        )
        self.assertEqual(response.status_code, 302)

        self.assertEqual(
            self.me_limits(),
            {
                "pm25": {"h24": 15, "annual": 40},
                "pm10": {"h24": 150, "annual": 50},
            },
        )

    def test_a_blank_field_is_served_as_null(self):
        self.post_limits(pm25_annual="40", pm10_h24="150")

        self.assertEqual(self.me_limits(), SEEDED)

    def test_a_negative_limit_is_rejected(self):
        response = self.post_limits(pm25_annual="-1", pm10_h24="150")

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.context["adminform"].form.errors)
        self.assertEqual(limits_row().pm25_annual, Decimal("40"))

    def test_the_change_page_cites_the_resolution(self):
        response = self.client.get(self.change_url)

        self.assertContains(response, "Resolución 259/2015")
        self.assertContains(response, "A confirmar")

    def test_the_changelist_opens_the_single_row(self):
        response = self.client.get(reverse("admin:api_madespmlimits_changelist"))

        self.assertRedirects(response, self.change_url)

    def test_a_second_row_cannot_be_added(self):
        response = self.client.get(reverse("admin:api_madespmlimits_add"))

        self.assertEqual(response.status_code, 403)

    def test_the_row_cannot_be_deleted(self):
        response = self.client.post(
            reverse("admin:api_madespmlimits_delete", args=[1]), {"post": "yes"}
        )

        self.assertEqual(response.status_code, 403)
        self.assertTrue(MadesPmLimits.objects.exists())

    def test_a_missing_row_can_be_recreated_from_the_admin(self):
        MadesPmLimits.objects.all().delete()

        changelist = self.client.get(reverse("admin:api_madespmlimits_changelist"))
        self.assertEqual(changelist.status_code, 200)

        response = self.post_limits(
            url=reverse("admin:api_madespmlimits_add"),
            pm25_annual="40",
            pm10_h24="150",
        )
        self.assertEqual(response.status_code, 302)
        self.assertEqual(self.me_limits(), SEEDED)

    def test_staff_without_the_permission_cannot_open_it(self):
        staff = User.objects.create_user("editor", password="x", is_staff=True)
        self.client.force_login(staff)

        response = self.client.get(self.change_url)

        self.assertEqual(response.status_code, 403)
