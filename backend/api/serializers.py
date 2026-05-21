from rest_framework import serializers
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema_field
from .models import Regions, Stations, StationReadingsGold


class RegionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Regions
        fields = [
            "id",
            "name",
            "region_code",
            "bbox",
            "has_weather_data",
            "has_pattern_station",
        ]


class StationSerializer(serializers.ModelSerializer):
    region = RegionSerializer(allow_null=True)
    coordinates = serializers.SerializerMethodField()
    aqi_pm2_5 = serializers.SerializerMethodField()

    class Meta:
        model = Stations
        fields = [
            "id",
            "name",
            "region",
            "coordinates",
            "is_station_on",
            "is_pattern_station",
            "aqi_pm2_5",
        ]

    @extend_schema_field(
        serializers.ListField(
            child=serializers.FloatField(allow_null=True),
            min_length=2,
            max_length=2,
        )
    )
    def get_coordinates(self, obj) -> list[float | None]:
        return [obj.latitude, obj.longitude]

    @extend_schema_field(OpenApiTypes.FLOAT)
    def get_aqi_pm2_5(self, obj) -> float | None:
        if hasattr(obj, "latest_aqi_pm2_5"):
            return obj.latest_aqi_pm2_5

        last_reading = (
            StationReadingsGold.objects.filter(station_id=obj.id)
            .order_by("-date_utc")
            .first()
        )
        return last_reading.aqi_pm2_5 if last_reading else None


class HealthSerializer(serializers.Serializer):
    status = serializers.CharField()


class MapSerializer(serializers.Serializer):
    aqi = serializers.FloatField()
    forecast_6h = serializers.JSONField()
    forecast_12h = serializers.JSONField()


class ForecastSerializer(serializers.Serializer):
    forecast_date = serializers.DateTimeField()
    aqi_level = serializers.JSONField()
    forecast_6h = serializers.JSONField()
    forecast_12h = serializers.JSONField()


class HistorySerializer(serializers.Serializer):
    historical_1d = serializers.JSONField()
    historical_7d = serializers.JSONField()
    historical_30d = serializers.JSONField()
