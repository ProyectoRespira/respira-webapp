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

        self.older_run = InferenceRuns.objects.create(
            id=uuid.UUID("ffffffff-ffff-ffff-ffff-ffffffffffff"),
            run_date=latest_reading_time - timedelta(hours=6),
        )
        self.latest_run = InferenceRuns.objects.create(
            id=uuid.UUID("00000000-0000-0000-0000-000000000001"),
            run_date=latest_reading_time,
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
