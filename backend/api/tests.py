import uuid
from datetime import datetime, timedelta, timezone

from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient

from .models import (
    InferenceResults,
    InferenceRuns,
    RegionReadings,
    Regions,
    StationReadingsGold,
    Stations,
)


class BackendEndpointTests(TestCase):
    def _create_inference_run(
        self,
        *,
        run_id,
        run_date,
        flow_run_id,
        status=InferenceRuns.Status.SUCCESS,
        started_at=None,
    ):
        started_at = started_at or (run_date - timedelta(minutes=5))
        return InferenceRuns.objects.create(
            id=run_id,
            run_date=run_date,
            flow_run_id=flow_run_id,
            deployment=self.base_run_payload["deployment"],
            window_hours=self.base_run_payload["window_hours"],
            min_points=self.base_run_payload["min_points"],
            model_6h_version=self.base_run_payload["model_6h_version"],
            model_12h_version=self.base_run_payload["model_12h_version"],
            model_6h_path=self.base_run_payload["model_6h_path"],
            model_12h_path=self.base_run_payload["model_12h_path"],
            started_at=started_at,
            status=status,
            stations_total=self.base_run_payload["stations_total"],
            stations_success=self.base_run_payload["stations_success"],
            stations_skipped=self.base_run_payload["stations_skipped"],
            stations_failed=self.base_run_payload["stations_failed"],
        )

    def setUp(self):
        self.client = APIClient()

        self.region = Regions.objects.create(
            id=1,
            name="Gran Asuncion",
            region_code="GRAN_ASUNCION",
            bbox="-57.680,-25.410,-57.470,-25.140",
            has_weather_data=True,
            has_pattern_station=False,
        )
        self.other_region = Regions.objects.create(
            id=2,
            name="Central",
            region_code="CENTRAL",
            bbox="-57.620,-25.500,-57.300,-25.100",
            has_weather_data=False,
            has_pattern_station=True,
        )

        self.station = Stations.objects.create(
            id=101,
            name="FIUNA: Campus",
            region=self.region,
            latitude=-25.3,
            longitude=-57.5,
            is_station_on=True,
            is_pattern_station=False,
        )
        self.region_station_2 = Stations.objects.create(
            id=102,
            name="AireLibre: Centro",
            region=self.region,
            latitude=-25.29,
            longitude=-57.49,
            is_station_on=True,
            is_pattern_station=False,
        )
        self.other_station = Stations.objects.create(
            id=201,
            name="AireLibre: Other",
            region=self.other_region,
            latitude=-25.28,
            longitude=-57.48,
            is_station_on=True,
            is_pattern_station=False,
        )

        latest_reading_time = datetime(2026, 3, 31, 12, 0, tzinfo=timezone.utc)
        StationReadingsGold.objects.create(
            station=self.station,
            date_utc=latest_reading_time,
            aqi_pm2_5=84.0,
        )
        StationReadingsGold.objects.create(
            station=self.region_station_2,
            date_utc=latest_reading_time,
            aqi_pm2_5=60.0,
        )
        StationReadingsGold.objects.create(
            station=self.other_station,
            date_utc=latest_reading_time,
            aqi_pm2_5=150.0,
        )
        RegionReadings.objects.create(
            region=self.region,
            date_utc=latest_reading_time,
            aqi_region_avg=72.0,
        )

        self.base_run_payload = {
            "flow_run_id": "flow-run-test",
            "deployment": "test",
            "window_hours": 24,
            "min_points": 6,
            "model_6h_version": "model-6h-v1",
            "model_12h_version": "model-12h-v1",
            "model_6h_path": "/models/6h.pkl",
            "model_12h_path": "/models/12h.pkl",
            "started_at": latest_reading_time - timedelta(minutes=5),
            "status": InferenceRuns.Status.SUCCESS,
            "stations_total": 3,
            "stations_success": 3,
            "stations_skipped": 0,
            "stations_failed": 0,
        }

        self.older_run = self._create_inference_run(
            run_id=uuid.UUID("ffffffff-ffff-ffff-ffff-ffffffffffff"),
            run_date=latest_reading_time - timedelta(hours=6),
            flow_run_id=f"{self.base_run_payload['flow_run_id']}-older",
            status=self.base_run_payload["status"],
            started_at=self.base_run_payload["started_at"] - timedelta(hours=6),
        )
        self.latest_run = self._create_inference_run(
            run_id=uuid.UUID("00000000-0000-0000-0000-000000000001"),
            run_date=latest_reading_time,
            flow_run_id=self.base_run_payload["flow_run_id"],
            status=self.base_run_payload["status"],
            started_at=self.base_run_payload["started_at"],
        )

        InferenceResults.objects.create(
            inference_run=self.older_run,
            station=self.station,
            forecasts_6h=[{"timestamp": "2026-03-31 05:00:00", "value": 10}],
            forecasts_12h=[{"timestamp": "2026-03-31 05:00:00", "value": 15}],
            aqi_input=[{"timestamp": "2026-03-31 04:00:00", "value": 50}],
        )
        InferenceResults.objects.create(
            inference_run=self.latest_run,
            station=self.station,
            forecasts_6h=[{"timestamp": "2026-03-31 12:00:00", "value": 20}],
            forecasts_12h=[{"timestamp": "2026-03-31 12:00:00", "value": 25}],
            aqi_input=[{"timestamp": "2026-03-31 11:00:00", "value": 84}],
        )
        InferenceResults.objects.create(
            inference_run=self.latest_run,
            station=self.region_station_2,
            forecasts_6h=[{"timestamp": "2026-03-31 12:00:00", "value": 40}],
            forecasts_12h=[{"timestamp": "2026-03-31 12:00:00", "value": 45}],
            aqi_input=[{"timestamp": "2026-03-31 11:00:00", "value": 60}],
        )
        InferenceResults.objects.create(
            inference_run=self.latest_run,
            station=self.other_station,
            forecasts_6h=[{"timestamp": "2026-03-31 12:00:00", "value": 90}],
            forecasts_12h=[{"timestamp": "2026-03-31 12:00:00", "value": 95}],
            aqi_input=[{"timestamp": "2026-03-31 11:00:00", "value": 150}],
        )

    def test_health_endpoint(self):
        response = self.client.get(reverse("health"))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "ok"})

    def test_station_list_keeps_frontend_shape(self):
        response = self.client.get(reverse("stations-list"))

        self.assertEqual(response.status_code, 200)
        first_station = response.json()[0]
        self.assertEqual(
            set(first_station.keys()),
            {
                "id",
                "name",
                "region",
                "coordinates",
                "is_station_on",
                "is_pattern_station",
                "aqi_pm2_5",
            },
        )
        self.assertEqual(first_station["region"]["has_pattern_station"], False)
        self.assertEqual(first_station["coordinates"], [-25.3, -57.5])
        self.assertEqual(first_station["aqi_pm2_5"], 84.0)

    def test_station_list_is_ordered_by_id(self):
        response = self.client.get(reverse("stations-list"))

        self.assertEqual(response.status_code, 200)
        ids = [station["id"] for station in response.json()]
        self.assertEqual(ids, sorted(ids))

    def test_station_map_returns_station_specific_forecasts(self):
        response = self.client.get(
            reverse("map"), {"entity": "station", "id": self.station.id}
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(set(payload.keys()), {"aqi", "forecast_6h", "forecast_12h"})
        self.assertEqual(payload["aqi"], 84.0)
        self.assertEqual(
            payload["forecast_6h"], [{"timestamp": "2026-03-31 12:00:00", "value": 20}]
        )
        self.assertEqual(
            payload["forecast_12h"], [{"timestamp": "2026-03-31 12:00:00", "value": 25}]
        )

    def test_region_map_averages_only_region_stations(self):
        response = self.client.get(
            reverse("map"), {"entity": "region", "id": self.region.id}
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["aqi"], 72.0)
        self.assertEqual(
            payload["forecast_6h"],
            [{"timestamp": "2026-03-31 12:00:00", "value": 30.0}],
        )
        self.assertEqual(
            payload["forecast_12h"],
            [{"timestamp": "2026-03-31 12:00:00", "value": 35.0}],
        )

    def test_region_map_ignores_latest_non_success_run(self):
        failed_run = self._create_inference_run(
            run_id=uuid.UUID("00000000-0000-0000-0000-000000000002"),
            run_date=datetime(2026, 3, 31, 13, 0, tzinfo=timezone.utc),
            flow_run_id="flow-run-failed",
            status=InferenceRuns.Status.FAILED,
        )
        InferenceResults.objects.create(
            inference_run=failed_run,
            station=self.station,
            forecasts_6h=[{"timestamp": "2026-03-31 13:00:00", "value": 999}],
            forecasts_12h=[{"timestamp": "2026-03-31 13:00:00", "value": 999}],
            aqi_input=[{"timestamp": "2026-03-31 12:00:00", "value": 84}],
        )
        InferenceResults.objects.create(
            inference_run=failed_run,
            station=self.region_station_2,
            forecasts_6h=[{"timestamp": "2026-03-31 13:00:00", "value": 999}],
            forecasts_12h=[{"timestamp": "2026-03-31 13:00:00", "value": 999}],
            aqi_input=[{"timestamp": "2026-03-31 12:00:00", "value": 60}],
        )

        response = self.client.get(
            reverse("map"), {"entity": "region", "id": self.region.id}
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(
            payload["forecast_6h"],
            [{"timestamp": "2026-03-31 12:00:00", "value": 30.0}],
        )
        self.assertEqual(
            payload["forecast_12h"],
            [{"timestamp": "2026-03-31 12:00:00", "value": 35.0}],
        )

    def test_region_map_uses_latest_region_run_without_mixing_station_runs(self):
        newest_success_run = self._create_inference_run(
            run_id=uuid.UUID("00000000-0000-0000-0000-000000000006"),
            run_date=datetime(2026, 3, 31, 13, 30, tzinfo=timezone.utc),
            flow_run_id="flow-run-region-newest",
            status=InferenceRuns.Status.SUCCESS,
        )
        InferenceResults.objects.create(
            inference_run=newest_success_run,
            station=self.region_station_2,
            forecasts_6h=[{"timestamp": "2026-03-31 13:30:00", "value": 55}],
            forecasts_12h=[{"timestamp": "2026-03-31 13:30:00", "value": 65}],
            aqi_input=[{"timestamp": "2026-03-31 13:00:00", "value": 60}],
        )

        response = self.client.get(
            reverse("map"), {"entity": "region", "id": self.region.id}
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(
            payload["forecast_6h"],
            [{"timestamp": "2026-03-31 13:30:00", "value": 55.0}],
        )
        self.assertEqual(
            payload["forecast_12h"],
            [{"timestamp": "2026-03-31 13:30:00", "value": 65.0}],
        )

    def test_region_map_falls_back_when_latest_region_run_has_empty_forecasts(self):
        newest_success_run = self._create_inference_run(
            run_id=uuid.UUID("00000000-0000-0000-0000-000000000007"),
            run_date=datetime(2026, 3, 31, 14, 30, tzinfo=timezone.utc),
            flow_run_id="flow-run-region-empty",
            status=InferenceRuns.Status.SUCCESS,
        )
        InferenceResults.objects.create(
            inference_run=newest_success_run,
            station=self.station,
            forecasts_6h=[],
            forecasts_12h=[],
            aqi_input=[{"timestamp": "2026-03-31 14:00:00", "value": 84}],
        )
        InferenceResults.objects.create(
            inference_run=newest_success_run,
            station=self.region_station_2,
            forecasts_6h=[],
            forecasts_12h=[],
            aqi_input=[{"timestamp": "2026-03-31 14:00:00", "value": 60}],
        )

        response = self.client.get(
            reverse("map"), {"entity": "region", "id": self.region.id}
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(
            payload["forecast_6h"],
            [{"timestamp": "2026-03-31 12:00:00", "value": 30.0}],
        )
        self.assertEqual(
            payload["forecast_12h"],
            [{"timestamp": "2026-03-31 12:00:00", "value": 35.0}],
        )

    def test_station_map_resolves_latest_available_forecast_per_station(self):
        newest_success_run = self._create_inference_run(
            run_id=uuid.UUID("00000000-0000-0000-0000-000000000003"),
            run_date=datetime(2026, 3, 31, 13, 30, tzinfo=timezone.utc),
            flow_run_id="flow-run-success-newest",
            status=InferenceRuns.Status.SUCCESS,
        )
        InferenceResults.objects.create(
            inference_run=newest_success_run,
            station=self.station,
            forecasts_6h=[],
            forecasts_12h=[],
            aqi_input=[{"timestamp": "2026-03-31 13:00:00", "value": 84}],
        )
        InferenceResults.objects.create(
            inference_run=newest_success_run,
            station=self.region_station_2,
            forecasts_6h=[{"timestamp": "2026-03-31 13:30:00", "value": 55}],
            forecasts_12h=[{"timestamp": "2026-03-31 13:30:00", "value": 65}],
            aqi_input=[{"timestamp": "2026-03-31 13:00:00", "value": 60}],
        )

        station_1_response = self.client.get(
            reverse("map"), {"entity": "station", "id": self.station.id}
        )
        station_2_response = self.client.get(
            reverse("map"), {"entity": "station", "id": self.region_station_2.id}
        )

        self.assertEqual(station_1_response.status_code, 200)
        self.assertEqual(station_2_response.status_code, 200)

        self.assertEqual(
            station_1_response.json()["forecast_6h"],
            [{"timestamp": "2026-03-31 12:00:00", "value": 20}],
        )
        self.assertEqual(
            station_1_response.json()["forecast_12h"],
            [{"timestamp": "2026-03-31 12:00:00", "value": 25}],
        )
        self.assertEqual(
            station_2_response.json()["forecast_6h"],
            [{"timestamp": "2026-03-31 13:30:00", "value": 55}],
        )
        self.assertEqual(
            station_2_response.json()["forecast_12h"],
            [{"timestamp": "2026-03-31 13:30:00", "value": 65}],
        )

    def test_station_forecast_uses_latest_run_date_not_latest_uuid(self):
        response = self.client.get(reverse("stations-forecast", args=[self.station.id]))

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(
            set(payload.keys()),
            {"forecast_date", "aqi_level", "forecast_6h", "forecast_12h"},
        )
        self.assertEqual(payload["forecast_date"], "2026-03-31T12:00:00Z")
        self.assertEqual(
            payload["aqi_level"], [{"timestamp": "2026-03-31 11:00:00", "value": 84}]
        )
        self.assertEqual(
            payload["forecast_6h"], [{"timestamp": "2026-03-31 12:00:00", "value": 20}]
        )
        self.assertEqual(
            payload["forecast_12h"], [{"timestamp": "2026-03-31 12:00:00", "value": 25}]
        )

    def test_station_forecast_ignores_latest_non_success_run(self):
        failed_run = self._create_inference_run(
            run_id=uuid.UUID("00000000-0000-0000-0000-000000000004"),
            run_date=datetime(2026, 3, 31, 14, 0, tzinfo=timezone.utc),
            flow_run_id="flow-run-failed-station-endpoint",
            status=InferenceRuns.Status.FAILED,
        )
        InferenceResults.objects.create(
            inference_run=failed_run,
            station=self.station,
            forecasts_6h=[{"timestamp": "2026-03-31 14:00:00", "value": 999}],
            forecasts_12h=[{"timestamp": "2026-03-31 14:00:00", "value": 999}],
            aqi_input=[{"timestamp": "2026-03-31 13:30:00", "value": 200}],
        )

        response = self.client.get(reverse("stations-forecast", args=[self.station.id]))
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["forecast_date"], "2026-03-31T12:00:00Z")
        self.assertEqual(
            payload["forecast_6h"], [{"timestamp": "2026-03-31 12:00:00", "value": 20}]
        )

    def test_station_forecast_falls_back_when_latest_success_has_empty_forecasts(self):
        newer_success_run = self._create_inference_run(
            run_id=uuid.UUID("00000000-0000-0000-0000-000000000005"),
            run_date=datetime(2026, 3, 31, 14, 30, tzinfo=timezone.utc),
            flow_run_id="flow-run-success-empty-forecast",
            status=InferenceRuns.Status.SUCCESS,
        )
        InferenceResults.objects.create(
            inference_run=newer_success_run,
            station=self.station,
            forecasts_6h=[],
            forecasts_12h=[],
            aqi_input=[{"timestamp": "2026-03-31 14:00:00", "value": 120}],
        )

        response = self.client.get(reverse("stations-forecast", args=[self.station.id]))

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["forecast_date"], "2026-03-31T12:00:00Z")
        self.assertEqual(
            payload["aqi_level"], [{"timestamp": "2026-03-31 11:00:00", "value": 84}]
        )
        self.assertEqual(
            payload["forecast_6h"], [{"timestamp": "2026-03-31 12:00:00", "value": 20}]
        )
        self.assertEqual(
            payload["forecast_12h"], [{"timestamp": "2026-03-31 12:00:00", "value": 25}]
        )


class AdminUserManagementTests(TestCase):
    """Tests for the /api/admin/users/ administrative CRUD endpoints."""

    def setUp(self):
        from django.contrib.auth import get_user_model
        from api.models import UserProfile

        self.User = get_user_model()
        self.UserProfile = UserProfile
        self.client = APIClient()

        self.list_url = reverse("admin-users-list")

        self.superadmin = self._make_user("super@example.com", "superadmin")
        self.admin = self._make_user("admin@example.com", "admin")
        self.viewer = self._make_user("viewer@example.com", "viewer")

    def _make_user(self, email, role, password="S3ed!Pass99"):
        user = self.User.objects.create_user(
            username=email, email=email, password=password
        )
        self.UserProfile.objects.create(user=user, role=role)
        return user

    def _role_of(self, user):
        return self.User.objects.get(pk=user.pk).profile.role

    def _detail_url(self, user_id):
        return reverse("admin-users-detail", args=[user_id])

    # --- Permissions ---------------------------------------------------

    def test_unauthenticated_request_is_rejected(self):
        response = self.client.get(self.list_url)
        self.assertIn(response.status_code, (401, 403))

    def test_viewer_cannot_manage_users(self):
        self.client.force_authenticate(self.viewer)
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, 403)

    def test_admin_can_list_users(self):
        self.client.force_authenticate(self.admin)
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, 200)
        self.assertIn("results", response.json())

    # --- Create --------------------------------------------------------

    def test_admin_creates_user_and_password_is_hashed(self):
        self.client.force_authenticate(self.admin)
        response = self.client.post(
            self.list_url,
            {
                "email": "new@example.com",
                "password": "Br4nd!New99",
                "first_name": "New",
                "last_name": "User",
                "role": "viewer",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertNotIn("password", response.json())

        created = self.User.objects.get(email="new@example.com")
        self.assertNotEqual(created.password, "Br4nd!New99")
        self.assertTrue(created.password.startswith("pbkdf2_"))
        self.assertTrue(created.check_password("Br4nd!New99"))

        # Appears in subsequent list requests
        list_response = self.client.get(self.list_url, {"email": "new@example.com"})
        emails = [u["email"] for u in list_response.json()["results"]]
        self.assertIn("new@example.com", emails)

    def test_duplicate_email_is_rejected(self):
        self.client.force_authenticate(self.admin)
        response = self.client.post(
            self.list_url,
            {"email": "viewer@example.com", "password": "An0ther!Pass99"},
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("email", response.json())

    def test_weak_password_is_rejected(self):
        self.client.force_authenticate(self.admin)
        response = self.client.post(
            self.list_url,
            {"email": "weak@example.com", "password": "123"},
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("password", response.json())

    # --- Superadmin role restriction ----------------------------------

    def test_admin_cannot_assign_superadmin_role_on_create(self):
        self.client.force_authenticate(self.admin)
        response = self.client.post(
            self.list_url,
            {
                "email": "wannabe@example.com",
                "password": "W4nna!Pass99",
                "role": "superadmin",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("role", response.json())

    def test_superadmin_can_assign_superadmin_role(self):
        self.client.force_authenticate(self.superadmin)
        response = self.client.post(
            self.list_url,
            {
                "email": "promoted@example.com",
                "password": "Pr0mo!Pass99",
                "role": "superadmin",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(
            self.User.objects.get(email="promoted@example.com").profile.role,
            "superadmin",
        )

    def test_admin_cannot_promote_existing_user_to_superadmin(self):
        self.client.force_authenticate(self.admin)
        response = self.client.patch(
            self._detail_url(self.viewer.id), {"role": "superadmin"}, format="json"
        )
        self.assertEqual(response.status_code, 400)

    # --- Update --------------------------------------------------------

    def test_admin_updates_profile_and_role(self):
        self.client.force_authenticate(self.admin)
        response = self.client.patch(
            self._detail_url(self.viewer.id),
            {"first_name": "Updated", "role": "admin"},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        # Response must reflect the new role immediately, not a stale profile.
        self.assertEqual(response.json()["role"], "admin")
        self.viewer.refresh_from_db()
        self.assertEqual(self.viewer.first_name, "Updated")
        self.assertEqual(self._role_of(self.viewer), "admin")

    def test_update_password_is_hashed(self):
        self.client.force_authenticate(self.admin)
        response = self.client.patch(
            self._detail_url(self.viewer.id),
            {"password": "Ch4nged!Pass99"},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.viewer.refresh_from_db()
        self.assertTrue(self.viewer.check_password("Ch4nged!Pass99"))

    # --- Delete (soft) -------------------------------------------------

    def test_delete_deactivates_user(self):
        self.client.force_authenticate(self.admin)
        response = self.client.delete(self._detail_url(self.viewer.id))
        self.assertEqual(response.status_code, 204)
        self.viewer.refresh_from_db()
        self.assertFalse(self.viewer.is_active)
        # Row still exists (soft delete)
        self.assertTrue(self.User.objects.filter(id=self.viewer.id).exists())

    def test_admin_cannot_delete_own_account(self):
        self.client.force_authenticate(self.admin)
        response = self.client.delete(self._detail_url(self.admin.id))
        self.assertEqual(response.status_code, 403)
        self.admin.refresh_from_db()
        self.assertTrue(self.admin.is_active)

    # --- Filtering & pagination ---------------------------------------

    def test_filter_by_role_and_active_status(self):
        self.client.force_authenticate(self.admin)

        response = self.client.get(self.list_url, {"role": "viewer"})
        roles = {u["role"] for u in response.json()["results"]}
        self.assertEqual(roles, {"viewer"})

        self.viewer.is_active = False
        self.viewer.save(update_fields=["is_active"])
        response = self.client.get(self.list_url, {"is_active": "false"})
        ids = {u["id"] for u in response.json()["results"]}
        self.assertIn(self.viewer.id, ids)
        self.assertNotIn(self.admin.id, ids)

    def test_list_is_paginated(self):
        self.client.force_authenticate(self.admin)
        response = self.client.get(self.list_url)
        body = response.json()
        for key in ("count", "next", "previous", "results"):
            self.assertIn(key, body)
