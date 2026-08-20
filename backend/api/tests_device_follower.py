"""Tests for the device-follower feature (model, API and admin).

The feature is unauthenticated by design, so the tests carry two burdens the
other API tests do not: proving that a device ends up with exactly one row no
matter how the app retries, and proving that the identifier rules which stand
in for authentication (random v4 UUIDs only) are actually enforced.
"""

import uuid

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.db import IntegrityError, transaction
from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .models import DeviceFollower, Regions, Stations
from .views import INSTALLATION_ID_HEADER

User = get_user_model()

# A v4 UUID (the third group starts with "4"), as the app would generate.
INSTALLATION_ID = "8f14e45f-ceea-467e-bd97-1a2b3c4d5e6f"
OTHER_INSTALLATION_ID = "2c1f9b4a-77d3-4e21-9a5c-6b0e8d3f1a2b"
# Version 1: encodes a MAC address and a timestamp, which is exactly the
# derived, guessable kind of identifier this feature rejects.
V1_INSTALLATION_ID = "d9428888-122b-11e1-b85c-61cd3cbb3210"


class DeviceFollowerModelTests(TestCase):
    def setUp(self):
        self.region = Regions.objects.create(name="Gran Asunción", region_code="GA")
        self.station = Stations.objects.create(
            name="Respira: Villa Morra", region=self.region, station_code="RSP-001"
        )
        self.other_station = Stations.objects.create(
            name="Respira: San Lorenzo", region=self.region, station_code="RSP-002"
        )

    def test_installation_id_is_unique(self):
        DeviceFollower.objects.create(
            installation_id=INSTALLATION_ID, station_code="RSP-001"
        )

        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                DeviceFollower.objects.create(
                    installation_id=INSTALLATION_ID, station_code="RSP-002"
                )

    def test_upsert_creates_then_updates_the_same_row(self):
        follower, created = DeviceFollower.upsert(
            INSTALLATION_ID, station_code="RSP-001"
        )
        self.assertTrue(created)

        updated, created_again = DeviceFollower.upsert(
            INSTALLATION_ID, station_code="RSP-002"
        )

        self.assertFalse(created_again)
        self.assertEqual(updated.pk, follower.pk)
        self.assertEqual(updated.station_code, "RSP-002")
        self.assertEqual(DeviceFollower.objects.count(), 1)

    def test_upsert_leaves_untouched_fields_alone(self):
        DeviceFollower.upsert(
            INSTALLATION_ID, station_code="RSP-001", push_token="fcm:abc"
        )

        # A push-token refresh carries no station, and must not clear it.
        follower, _ = DeviceFollower.upsert(INSTALLATION_ID, push_token="fcm:def")

        self.assertEqual(follower.station_code, "RSP-001")
        self.assertEqual(follower.push_token, "fcm:def")

    def test_a_push_token_is_claimed_from_any_previous_installation(self):
        """A reinstall gets a new installation id but may keep the OS token.

        Without claiming, the abandoned row would keep the token and the phone
        would be notified about two stations at once.
        """
        stale, _ = DeviceFollower.upsert(
            OTHER_INSTALLATION_ID, station_code="RSP-002", push_token="fcm:shared"
        )

        DeviceFollower.upsert(
            INSTALLATION_ID, station_code="RSP-001", push_token="fcm:shared"
        )

        stale.refresh_from_db()
        self.assertEqual(stale.push_token, "")
        self.assertEqual(
            DeviceFollower.objects.filter(push_token="fcm:shared").count(), 1
        )

    def test_station_is_resolved_from_the_code_not_a_stored_id(self):
        follower, _ = DeviceFollower.upsert(INSTALLATION_ID, station_code="RSP-001")
        self.assertEqual(follower.station, self.station)

        # What a dbt run does: the same station comes back under a new id.
        original_id = self.station.id
        self.station.delete()
        renumbered = Stations.objects.create(
            id=original_id + 500,
            name="Respira: Villa Morra",
            region=self.region,
            station_code="RSP-001",
        )

        self.assertEqual(follower.station, renumbered)

    def test_station_is_none_when_the_code_no_longer_exists(self):
        follower, _ = DeviceFollower.upsert(INSTALLATION_ID, station_code="RSP-404")
        self.assertIsNone(follower.station)


class DeviceFollowerAPITests(APITestCase):
    def setUp(self):
        # The endpoints are throttled per IP and every test client shares
        # 127.0.0.1, so the throttle history is reset between tests.
        cache.clear()
        self.region = Regions.objects.create(name="Gran Asunción", region_code="GA")
        self.station = Stations.objects.create(
            name="Respira: Villa Morra", region=self.region, station_code="RSP-001"
        )
        self.other_station = Stations.objects.create(
            name="Respira: San Lorenzo", region=self.region, station_code="RSP-002"
        )
        self.list_url = reverse("device-followers-list")
        self.me_url = reverse("device-followers-me")

    def _header(self, installation_id=INSTALLATION_ID):
        return {INSTALLATION_ID_HEADER: installation_id}

    # --- registering ------------------------------------------------------

    def test_first_registration_creates_the_follower(self):
        response = self.client.post(
            self.list_url,
            {"installation_id": INSTALLATION_ID, "station": self.station.id},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["station"], self.station.id)
        self.assertEqual(response.data["station_code"], "RSP-001")
        self.assertEqual(response.data["station_name"], self.station.name)
        self.assertFalse(response.data["has_push_token"])

        follower = DeviceFollower.objects.get()
        self.assertEqual(str(follower.installation_id), INSTALLATION_ID)
        self.assertEqual(follower.station_code, "RSP-001")

    def test_registration_accepts_the_installation_id_header(self):
        response = self.client.post(
            self.list_url,
            {"station": self.station.id},
            format="json",
            headers=self._header(),
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(DeviceFollower.objects.count(), 1)

    def test_registration_stores_a_push_token_when_sent(self):
        response = self.client.post(
            self.list_url,
            {
                "installation_id": INSTALLATION_ID,
                "station": self.station.id,
                "push_token": "fcm:abc123",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data["has_push_token"])
        self.assertEqual(DeviceFollower.objects.get().push_token, "fcm:abc123")

    def test_the_push_token_is_never_echoed_back(self):
        """These endpoints are unauthenticated: knowing an installation id must
        not be enough to read back the device's push token."""
        self.client.post(
            self.list_url,
            {
                "installation_id": INSTALLATION_ID,
                "station": self.station.id,
                "push_token": "fcm:abc123",
            },
            format="json",
        )

        response = self.client.get(self.me_url, headers=self._header())

        self.assertNotIn("push_token", response.data)
        self.assertNotIn("fcm:abc123", str(response.data))

    def test_a_duplicate_registration_updates_instead_of_failing(self):
        payload = {"installation_id": INSTALLATION_ID, "station": self.station.id}
        first = self.client.post(self.list_url, payload, format="json")
        second = self.client.post(self.list_url, payload, format="json")

        self.assertEqual(first.status_code, status.HTTP_201_CREATED)
        self.assertEqual(second.status_code, status.HTTP_200_OK)
        self.assertEqual(DeviceFollower.objects.count(), 1)

    def test_following_another_station_updates_the_existing_row(self):
        self.client.post(
            self.list_url,
            {"installation_id": INSTALLATION_ID, "station": self.station.id},
            format="json",
        )

        response = self.client.post(
            self.list_url,
            {"installation_id": INSTALLATION_ID, "station": self.other_station.id},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["station"], self.other_station.id)
        self.assertEqual(DeviceFollower.objects.count(), 1)
        self.assertEqual(DeviceFollower.objects.get().station_code, "RSP-002")

    def test_two_devices_keep_separate_rows(self):
        self.client.post(
            self.list_url,
            {"installation_id": INSTALLATION_ID, "station": self.station.id},
            format="json",
        )
        self.client.post(
            self.list_url,
            {
                "installation_id": OTHER_INSTALLATION_ID,
                "station": self.other_station.id,
            },
            format="json",
        )

        self.assertEqual(DeviceFollower.objects.count(), 2)

    # --- validation -------------------------------------------------------

    def test_an_unknown_station_is_rejected(self):
        response = self.client.post(
            self.list_url,
            {"installation_id": INSTALLATION_ID, "station": 999999},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("station", response.data)
        self.assertFalse(DeviceFollower.objects.exists())

    def test_a_station_without_a_station_code_cannot_be_followed(self):
        unmapped = Stations.objects.create(name="Respira: nueva", region=self.region)

        response = self.client.post(
            self.list_url,
            {"installation_id": INSTALLATION_ID, "station": unmapped.id},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("station", response.data)

    def test_registration_requires_a_station(self):
        response = self.client.post(
            self.list_url, {"installation_id": INSTALLATION_ID}, format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("station", response.data)

    def test_a_missing_installation_id_is_rejected(self):
        response = self.client.post(
            self.list_url, {"station": self.station.id}, format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("installation_id", response.data)

    def test_a_malformed_installation_id_is_rejected(self):
        response = self.client.post(
            self.list_url,
            {"installation_id": "not-a-uuid", "station": self.station.id},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("installation_id", response.data)

    def test_a_non_random_uuid_is_rejected(self):
        response = self.client.post(
            self.list_url,
            {"installation_id": V1_INSTALLATION_ID, "station": self.station.id},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("installation_id", response.data)
        self.assertFalse(DeviceFollower.objects.exists())

    # --- retrieving -------------------------------------------------------

    def test_retrieving_the_followed_station_by_header(self):
        DeviceFollower.upsert(INSTALLATION_ID, station_code="RSP-001")

        response = self.client.get(self.me_url, headers=self._header())

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["station"], self.station.id)
        self.assertEqual(response.data["station_name"], self.station.name)

    def test_retrieving_the_followed_station_by_query_parameter(self):
        DeviceFollower.upsert(INSTALLATION_ID, station_code="RSP-001")

        response = self.client.get(self.me_url, {"installation_id": INSTALLATION_ID})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["station"], self.station.id)

    def test_retrieving_returns_the_current_station_id_after_renumbering(self):
        DeviceFollower.upsert(INSTALLATION_ID, station_code="RSP-001")
        original_id = self.station.id
        self.station.delete()
        renumbered = Stations.objects.create(
            id=original_id + 500,
            name="Respira: Villa Morra",
            region=self.region,
            station_code="RSP-001",
        )

        response = self.client.get(self.me_url, headers=self._header())

        self.assertEqual(response.data["station"], renumbered.id)

    def test_retrieving_an_unknown_installation_returns_404(self):
        response = self.client.get(self.me_url, headers=self._header())

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_retrieving_reports_a_station_that_no_longer_exists_as_null(self):
        DeviceFollower.upsert(INSTALLATION_ID, station_code="RSP-001")
        self.station.delete()

        response = self.client.get(self.me_url, headers=self._header())

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNone(response.data["station"])
        self.assertEqual(response.data["station_code"], "RSP-001")

    # --- updating ---------------------------------------------------------

    def test_updating_the_push_token(self):
        DeviceFollower.upsert(
            INSTALLATION_ID, station_code="RSP-001", push_token="fcm:old"
        )

        response = self.client.patch(
            self.me_url,
            {"installation_id": INSTALLATION_ID, "push_token": "fcm:new"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        follower = DeviceFollower.objects.get()
        self.assertEqual(follower.push_token, "fcm:new")
        # The station is untouched by a token refresh.
        self.assertEqual(follower.station_code, "RSP-001")

    def test_updating_a_push_token_clears_it_from_an_older_installation(self):
        stale, _ = DeviceFollower.upsert(
            OTHER_INSTALLATION_ID, station_code="RSP-002", push_token="fcm:shared"
        )
        DeviceFollower.upsert(INSTALLATION_ID, station_code="RSP-001")

        self.client.patch(
            self.me_url,
            {"installation_id": INSTALLATION_ID, "push_token": "fcm:shared"},
            format="json",
        )

        stale.refresh_from_db()
        self.assertEqual(stale.push_token, "")

    def test_updating_the_followed_station(self):
        DeviceFollower.upsert(INSTALLATION_ID, station_code="RSP-001")

        response = self.client.patch(
            self.me_url,
            {"installation_id": INSTALLATION_ID, "station": self.other_station.id},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["station"], self.other_station.id)
        self.assertEqual(DeviceFollower.objects.count(), 1)

    def test_updating_an_unknown_installation_returns_404(self):
        response = self.client.patch(
            self.me_url,
            {"installation_id": INSTALLATION_ID, "push_token": "fcm:new"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_an_empty_update_is_rejected(self):
        DeviceFollower.upsert(INSTALLATION_ID, station_code="RSP-001")

        response = self.client.patch(
            self.me_url, {"installation_id": INSTALLATION_ID}, format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_an_update_to_an_unknown_station_is_rejected(self):
        DeviceFollower.upsert(INSTALLATION_ID, station_code="RSP-001")

        response = self.client.patch(
            self.me_url,
            {"installation_id": INSTALLATION_ID, "station": 999999},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(DeviceFollower.objects.get().station_code, "RSP-001")

    # --- unfollowing ------------------------------------------------------

    def test_unfollowing_deletes_the_record(self):
        DeviceFollower.upsert(INSTALLATION_ID, station_code="RSP-001")

        response = self.client.delete(self.me_url, headers=self._header())

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(DeviceFollower.objects.exists())

    def test_unfollowing_twice_is_idempotent(self):
        DeviceFollower.upsert(INSTALLATION_ID, station_code="RSP-001")
        self.client.delete(self.me_url, headers=self._header())

        response = self.client.delete(self.me_url, headers=self._header())

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

    def test_unfollowing_leaves_other_installations_alone(self):
        DeviceFollower.upsert(INSTALLATION_ID, station_code="RSP-001")
        DeviceFollower.upsert(OTHER_INSTALLATION_ID, station_code="RSP-002")

        self.client.delete(self.me_url, headers=self._header())

        self.assertEqual(
            DeviceFollower.objects.get().installation_id,
            uuid.UUID(OTHER_INSTALLATION_ID),
        )

    # --- schema -----------------------------------------------------------

    def test_the_endpoints_are_documented_in_the_openapi_schema(self):
        response = self.client.get(reverse("schema"), {"format": "json"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        paths = response.data["paths"]
        self.assertIn("/api/device-followers/", paths)
        self.assertIn("/api/device-followers/me/", paths)
        self.assertEqual(
            sorted(paths["/api/device-followers/me/"]),
            ["delete", "get", "patch"],
        )


class DeviceFollowerAdminTests(TestCase):
    """The admin is read-only over API-owned rows, but must stay searchable."""

    def setUp(self):
        self.region = Regions.objects.create(name="Gran Asunción", region_code="GA")
        self.station = Stations.objects.create(
            name="Respira: Villa Morra", region=self.region, station_code="RSP-001"
        )
        self.push_token = "fcm:" + "AbCd1234" * 20 + "TailZ987"
        DeviceFollower.upsert(
            INSTALLATION_ID, station_code="RSP-001", push_token=self.push_token
        )
        DeviceFollower.upsert(OTHER_INSTALLATION_ID, station_code="RSP-002")

        self.superuser = User.objects.create_superuser(
            email="admin@proyectorespira.net", password="Sup3r-s3cret-pass!"
        )
        self.client.force_login(self.superuser)
        self.changelist_url = reverse("admin:api_devicefollower_changelist")

    def test_the_changelist_resolves_station_names(self):
        response = self.client.get(self.changelist_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertContains(response, "Respira: Villa Morra")
        # The follower on RSP-002 points at a station that does not exist.
        self.assertContains(response, "unknown station")

    def test_searching_by_installation_id(self):
        response = self.client.get(self.changelist_url, {"q": INSTALLATION_ID})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.context["cl"].result_count, 1)

    def test_searching_by_station_code(self):
        response = self.client.get(self.changelist_url, {"q": "RSP-001"})

        self.assertEqual(response.context["cl"].result_count, 1)

    def test_filtering_by_push_token_presence(self):
        with_token = self.client.get(self.changelist_url, {"has_push_token": "yes"})
        without_token = self.client.get(self.changelist_url, {"has_push_token": "no"})

        self.assertEqual(with_token.context["cl"].result_count, 1)
        self.assertEqual(without_token.context["cl"].result_count, 1)

    def test_the_changelist_masks_push_tokens(self):
        response = self.client.get(self.changelist_url)

        self.assertNotContains(response, self.push_token)
        self.assertContains(response, "…TailZ987")

    def test_followers_cannot_be_created_or_edited_from_the_admin(self):
        follower = DeviceFollower.objects.get(installation_id=INSTALLATION_ID)

        add = self.client.get(reverse("admin:api_devicefollower_add"))
        change = self.client.get(
            reverse("admin:api_devicefollower_change", args=[follower.pk])
        )

        self.assertEqual(add.status_code, status.HTTP_403_FORBIDDEN)
        # Django serves a read-only detail page when change permission is
        # absent but view permission is present.
        self.assertEqual(change.status_code, status.HTTP_200_OK)
        self.assertFalse(change.context["has_change_permission"])
