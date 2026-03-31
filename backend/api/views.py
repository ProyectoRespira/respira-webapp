from collections import defaultdict
from datetime import timedelta
from statistics import median, quantiles

from django.db.models.functions import TruncDate, TruncMonth, TruncWeek
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from .models import InferenceResults, InferenceRuns, RegionReadings, Regions, StationReadingsGold, Stations
from .serializers import ForecastSerializer, HealthSerializer, MapSerializer, RegionSerializer, StationSerializer


def _flatten_forecast_rows(rows):
    flattened = []
    for row in rows:
        if row:
            flattened.extend(row)
    return flattened


def _mean_forecast_by_timestamp(rows):
    grouped_values = defaultdict(list)
    for point in _flatten_forecast_rows(rows):
        grouped_values[point["timestamp"]].append(point["value"])

    return [
        {
            "timestamp": timestamp,
            "value": sum(values) / len(values),
        }
        for timestamp, values in sorted(grouped_values.items())
    ]


class HealthCheckView(generics.GenericAPIView):
    serializer_class = HealthSerializer
    http_method_names = ['get']

    def get(self, request, *args, **kwargs):
        return Response({"status": "ok"}, status=status.HTTP_200_OK)


class MapViewset(generics.GenericAPIView):
    serializer_class = MapSerializer
    http_method_names = ['get']

    def get(self, request, *args, **kwargs):
        entity = request.query_params.get('entity')
        entity_id = request.query_params.get('id')

        if not entity or not entity_id:
            return Response({
                "error": "Both 'entity' and 'id' are required."
            }, status=status.HTTP_400_BAD_REQUEST)

        if entity not in ['region', 'station']:
            return Response({
                "error": "'entity' must be either 'region' or 'station'."
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            entity_id = int(entity_id)
        except ValueError:
            return Response({
                "error": "'id' must be an integer."
            }, status=status.HTTP_400_BAD_REQUEST)

        latest_inference_run = InferenceRuns.objects.order_by('-run_date').first()
        if latest_inference_run is None:
            return Response({
                "error": "No inference runs available."
            }, status=status.HTTP_404_NOT_FOUND)

        if entity == 'region':
            latest_region_reading = RegionReadings.objects.filter(region_id=entity_id) \
                .order_by('-date_utc').first()

            if latest_region_reading is None:
                return Response({
                    "error": "No readings found for this region."
                }, status=status.HTTP_404_NOT_FOUND)

            forecast_results = InferenceResults.objects.filter(
                inference_run=latest_inference_run,
                station__region_id=entity_id,
            )
            result_forecast_6h = _mean_forecast_by_timestamp(
                forecast_results.values_list('forecasts_6h', flat=True)
            )
            result_forecast_12h = _mean_forecast_by_timestamp(
                forecast_results.values_list('forecasts_12h', flat=True)
            )

            if not result_forecast_6h or not result_forecast_12h:
                return Response({
                    "error": "No forecast data available for this region."
                }, status=status.HTTP_404_NOT_FOUND)

            latest_aqi = latest_region_reading.aqi_region_avg

        else:
            try:
                station = Stations.objects.get(id=entity_id)
            except Stations.DoesNotExist:
                return Response({
                    'error': 'Station ID does not exist in the database.'
                }, status=status.HTTP_404_NOT_FOUND)

            if station.is_pattern_station:
                return Response({
                    'error': 'Station ID is a pattern station.'
                }, status=status.HTTP_400_BAD_REQUEST)

            if not station.is_station_on:
                return Response({
                    'error': 'Station ID has been manually shut down due to maintenance.'
                }, status=status.HTTP_400_BAD_REQUEST)

            latest_station_reading = StationReadingsGold.objects.filter(station_id=entity_id) \
                .order_by('-date_utc').first()

            if latest_station_reading is None:
                return Response({
                    "error": "No readings found for this station."
                }, status=status.HTTP_404_NOT_FOUND)

            result_forecast_6h = _flatten_forecast_rows(
                InferenceResults.objects.filter(
                    inference_run=latest_inference_run,
                    station_id=entity_id,
                ).values_list('forecasts_6h', flat=True)
            )
            if not result_forecast_6h:
                return Response({
                    "error": "No forecast data available for this station."
                }, status=status.HTTP_404_NOT_FOUND)

            result_forecast_12h = _flatten_forecast_rows(
                InferenceResults.objects.filter(
                    inference_run=latest_inference_run,
                    station_id=entity_id,
                ).values_list('forecasts_12h', flat=True)
            )
            if not result_forecast_12h:
                return Response({
                    "error": "No 12-hour forecast data available for this station."
                }, status=status.HTTP_404_NOT_FOUND)

            latest_aqi = latest_station_reading.aqi_pm2_5

        return Response({
            "aqi": latest_aqi,
            "forecast_6h": result_forecast_6h,
            "forecast_12h": result_forecast_12h
        }, status=status.HTTP_200_OK)


class RegionViewset(ModelViewSet):
    queryset = Regions.objects.all()
    serializer_class = RegionSerializer
    http_method_names = ['get']


class StationViewset(ModelViewSet):
    queryset = Stations.objects.all()
    serializer_class = StationSerializer
    http_method_names = ['get']

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def forecast(self, request, *args, **kwargs):
        station = self.get_object()
        last_inference = InferenceResults.objects.filter(station=station) \
            .select_related('inference_run') \
            .order_by('-inference_run__run_date') \
            .first()

        if last_inference is None:
            return Response({
                "error": "No forecast data available for this station."
            }, status=status.HTTP_404_NOT_FOUND)

        payload = {
            "forecast_date": last_inference.inference_run.run_date,
            "aqi_level": last_inference.aqi_input or [],
            "forecast_6h": last_inference.forecasts_6h or [],
            "forecast_12h": last_inference.forecasts_12h or []
        }
        serializer = ForecastSerializer(data=payload)
        serializer.is_valid(raise_exception=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'])
    def boxplot(self, request, *args, **kwargs):
        station = self.get_object()
        period = request.query_params.get('period', '7d')

        now = timezone.now()
        if period == '7d':
            start_date = now - timedelta(days=7)
            trunc_func = TruncDate
        elif period == '30d':
            start_date = now - timedelta(days=30)
            trunc_func = TruncWeek
        elif period == '1y':
            start_date = now - timedelta(days=365)
            trunc_func = TruncMonth
        else:
            return Response({"error": "Invalid period. Use '7d', '30d' or '1y'."}, status=status.HTTP_400_BAD_REQUEST)

        readings = (
            StationReadingsGold.objects.filter(station_id=station.id, date_utc__gte=start_date)
            .annotate(period=trunc_func('date_utc'))
            .values('period', 'aqi_pm2_5')
        )

        period_values = defaultdict(list)
        for reading in readings:
            if reading['period'] is not None and reading['aqi_pm2_5'] is not None:
                period_values[reading['period']].append(reading['aqi_pm2_5'])

        box_data = {
            "x": [],
            "q1": [],
            "median": [],
            "q3": [],
            "lowerfence": [],
            "upperfence": []
        }

        for period_value, values in sorted(period_values.items()):
            values.sort()
            if len(values) == 1:
                q1 = median_value = q3 = lowerfence = upperfence = values[0]
            else:
                q1, _, q3 = quantiles(values, n=4)
                median_value = median(values)
                iqr = q3 - q1
                lowerfence = max(min(values), q1 - 1.5 * iqr)
                upperfence = min(max(values), q3 + 1.5 * iqr)

            box_data["x"].append(period_value.strftime('%Y-%m-%d'))
            box_data["q1"].append(q1)
            box_data["median"].append(median_value)
            box_data["q3"].append(q3)
            box_data["lowerfence"].append(lowerfence)
            box_data["upperfence"].append(upperfence)

        return Response(box_data, status=status.HTTP_200_OK)
