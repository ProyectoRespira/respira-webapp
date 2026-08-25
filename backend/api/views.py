import ipaddress
from collections import defaultdict
from datetime import timedelta
from math import asin, cos, radians, sin, sqrt
from statistics import median, quantiles

import requests
from dateutil.relativedelta import relativedelta
from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth import login as auth_login
from django.contrib.auth import logout as auth_logout
from django.core.cache import cache
from django.db.models import Avg, Prefetch
from django.db.models.functions import TruncDate, TruncMonth, TruncWeek
from django.middleware.csrf import get_token
from django.utils import timezone
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, extend_schema, extend_schema_view
from rest_framework import generics, mixins, status
from rest_framework.decorators import action
from rest_framework.exceptions import NotFound, PermissionDenied
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import GenericViewSet, ModelViewSet, ReadOnlyModelViewSet

from .aqi import classify_aqi
from .models import (
    ActionLog,
    FaqCategory,
    FaqQuestion,
    InferenceResults,
    InferenceRuns,
    Institution,
    InstitutionAlert,
    RegionReadings,
    Regions,
    StationReadingsGold,
    Stations,
    UserRole,
    get_institution_for_user,
)
from .pagination import StandardResultsSetPagination
from .permissions import IsAdminRole, IsInstitutionUser, IsOwnInstitution
from .serializers import (
    ActionLogSerializer,
    AdminUserCreateSerializer,
    AdminUserSerializer,
    AdminUserUpdateSerializer,
    FaqCategorySerializer,
    ForecastSerializer,
    HealthSerializer,
    InstitutionAlertSerializer,
    InstitutionDashboardSerializer,
    InstitutionLoginSerializer,
    InstitutionSerializer,
    MapSerializer,
    RegionSerializer,
    StationSerializer,
)

User = get_user_model()


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


def _successful_inference_runs():
    return InferenceRuns.objects.filter(status=InferenceRuns.Status.SUCCESS)


def _latest_region_forecasts(region_id):
    candidate_runs = (
        _successful_inference_runs()
        .filter(
            inferenceresults__station__region_id=region_id,
            inferenceresults__station__is_station_on=True,
        )
        .distinct()
        .order_by("-run_date", "-created_at")
    )

    for inference_run in candidate_runs:
        run_results = InferenceResults.objects.filter(
            inference_run=inference_run,
            station__region_id=region_id,
            station__is_station_on=True,
        )
        forecast_6h = _mean_forecast_by_timestamp(
            run_results.values_list("forecasts_6h", flat=True)
        )
        forecast_12h = _mean_forecast_by_timestamp(
            run_results.values_list("forecasts_12h", flat=True)
        )

        if forecast_6h and forecast_12h:
            return inference_run, forecast_6h, forecast_12h

    return None, [], []


def _latest_station_forecasts(station_id):
    candidate_runs = (
        _successful_inference_runs()
        .filter(inferenceresults__station_id=station_id)
        .distinct()
        .order_by("-run_date", "-created_at")
    )

    for inference_run in candidate_runs:
        run_results = InferenceResults.objects.filter(
            inference_run=inference_run,
            station_id=station_id,
        )
        forecast_6h = _flatten_forecast_rows(
            run_results.values_list("forecasts_6h", flat=True)
        )
        forecast_12h = _flatten_forecast_rows(
            run_results.values_list("forecasts_12h", flat=True)
        )

        if forecast_6h and forecast_12h:
            return inference_run, forecast_6h, forecast_12h

    return None, [], []


def _parse_lat_lon(request):
    lat_raw = request.query_params.get("lat")
    lon_raw = request.query_params.get("lon")
    if lat_raw is None or lon_raw is None:
        return (
            None,
            None,
            Response(
                {"error": "Both 'lat' and 'lon' query parameters are required."},
                status=status.HTTP_400_BAD_REQUEST,
            ),
        )
    try:
        lat = float(lat_raw)
        lon = float(lon_raw)
    except ValueError:
        return (
            None,
            None,
            Response(
                {"error": "'lat' and 'lon' must be valid numbers."},
                status=status.HTTP_400_BAD_REQUEST,
            ),
        )
    if not (-90.0 <= lat <= 90.0) or not (-180.0 <= lon <= 180.0):
        return (
            None,
            None,
            Response(
                {"error": "'lat' must be in [-90,90] and 'lon' in [-180,180]."},
                status=status.HTTP_400_BAD_REQUEST,
            ),
        )
    return lat, lon, None


# Provider must return JSON with a truthy "success" flag plus "latitude" and
# "longitude" fields (ipwho.is shape). Override via settings if needed.
# Prefer an endpoint that accepts the IP as a query parameter to avoid
# interpolating user-controlled values into the request URL path (SSRF).
IP_GEOLOCATION_URL = getattr(settings, "IP_GEOLOCATION_URL", "https://ipwho.is/json")
IP_GEOLOCATION_TIMEOUT = getattr(settings, "IP_GEOLOCATION_TIMEOUT", 4)
IP_GEOLOCATION_CACHE_TTL = getattr(settings, "IP_GEOLOCATION_CACHE_TTL", 6 * 60 * 60)


def _client_ip(request):
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR")
    if forwarded:
        # X-Forwarded-For is a comma-separated list; the original client is first.
        return forwarded.split(",")[0].strip()
    return request.META.get("HTTP_X_REAL_IP") or request.META.get("REMOTE_ADDR")


def _ip_geolocate(ip):
    """Resolve an approximate (lat, lon) for a public IP, or None on failure.

    Used as a fallback when a request arrives without coordinates (e.g. the
    mobile widget before the app has been opened and location granted). Results
    are cached per IP to avoid hammering the external provider on every widget
    refresh.
    """
    if not ip:
        return None
    try:
        parsed = ipaddress.ip_address(ip)
    except ValueError:
        return None
    if parsed.is_private or parsed.is_loopback or parsed.is_reserved:
        return None

    cache_key = f"ip_geo:{ip}"
    cached = cache.get(cache_key)
    if cached is not None:
        # Empty tuple marks a cached "no result" so repeated failures don't
        # keep calling the provider.
        return cached or None

    coords = None
    try:
        # Use a query parameter for the IP rather than formatting it into the
        # URL path. Ensure the IP was already validated by ipaddress above.
        response = requests.get(
            IP_GEOLOCATION_URL,
            params={"ip": str(parsed)},
            timeout=IP_GEOLOCATION_TIMEOUT,
        )
        if response.status_code == 200:
            data = response.json()
            # Many providers use `success` flag; default to True if absent.
            if data.get("success", True):
                lat = data.get("latitude")
                lon = data.get("longitude")
                if lat is not None and lon is not None:
                    coords = (float(lat), float(lon))
    except (requests.RequestException, ValueError, TypeError):
        coords = None

    cache.set(cache_key, coords or (), IP_GEOLOCATION_CACHE_TTL)
    return coords


def _haversine_km(lat1, lon1, lat2, lon2):
    r = 6371.0
    p1, p2 = radians(lat1), radians(lat2)
    dphi = radians(lat2 - lat1)
    dlam = radians(lon2 - lon1)
    a = sin(dphi / 2) ** 2 + cos(p1) * cos(p2) * sin(dlam / 2) ** 2
    return 2 * r * asin(sqrt(a))


def _nearest_active_station(lat, lon):
    candidates = Stations.objects.filter(
        is_station_on=True,
        is_pattern_station=False,
        latitude__isnull=False,
        longitude__isnull=False,
    )
    nearest = None
    nearest_distance = None
    for station in candidates:
        distance = _haversine_km(lat, lon, station.latitude, station.longitude)
        if nearest_distance is None or distance < nearest_distance:
            nearest = station
            nearest_distance = distance
    return nearest, nearest_distance


def _latest_station_inference_result(station_id):
    candidate_results = (
        InferenceResults.objects.filter(
            station_id=station_id,
            inference_run__status=InferenceRuns.Status.SUCCESS,
        )
        .select_related("inference_run")
        .order_by("-inference_run__run_date", "-inference_run__created_at")[:50]
    )

    for inference_result in candidate_results:
        if inference_result.forecasts_6h and inference_result.forecasts_12h:
            return inference_result

    return None


class HealthCheckView(generics.GenericAPIView):
    serializer_class = HealthSerializer
    http_method_names = ["get"]

    def get(self, request, *args, **kwargs):
        return Response({"status": "ok"}, status=status.HTTP_200_OK)


class MapViewset(generics.GenericAPIView):
    serializer_class = MapSerializer
    http_method_names = ["get"]

    def get(self, request, *args, **kwargs):
        entity = request.query_params.get("entity")
        entity_id = request.query_params.get("id")

        if not entity or not entity_id:
            return Response(
                {"error": "Both 'entity' and 'id' are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if entity not in ["region", "station"]:
            return Response(
                {"error": "'entity' must be either 'region' or 'station'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            entity_id = int(entity_id)
        except ValueError:
            return Response(
                {"error": "'id' must be an integer."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if entity == "region":
            latest_region_reading = (
                RegionReadings.objects.filter(region_id=entity_id)
                .order_by("-date_utc")
                .first()
            )

            if latest_region_reading is None:
                return Response(
                    {"error": "No readings found for this region."},
                    status=status.HTTP_404_NOT_FOUND,
                )

            _, result_forecast_6h, result_forecast_12h = _latest_region_forecasts(
                entity_id
            )

            if not result_forecast_6h or not result_forecast_12h:
                return Response(
                    {"error": "No forecast data available for this region."},
                    status=status.HTTP_404_NOT_FOUND,
                )

            latest_aqi = latest_region_reading.aqi_region_avg

        else:
            try:
                station = Stations.objects.get(id=entity_id)
            except Stations.DoesNotExist:
                return Response(
                    {"error": "Station ID does not exist in the database."},
                    status=status.HTTP_404_NOT_FOUND,
                )

            if station.is_pattern_station:
                return Response(
                    {"error": "Station ID is a pattern station."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if not station.is_station_on:
                return Response(
                    {
                        "error": "Station ID has been manually shut down due to maintenance."
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            latest_station_reading = (
                StationReadingsGold.objects.filter(station_id=entity_id)
                .order_by("-date_utc")
                .first()
            )

            if latest_station_reading is None:
                return Response(
                    {"error": "No readings found for this station."},
                    status=status.HTTP_404_NOT_FOUND,
                )

            _, result_forecast_6h, result_forecast_12h = _latest_station_forecasts(
                entity_id
            )
            if not result_forecast_6h:
                return Response(
                    {"error": "No forecast data available for this station."},
                    status=status.HTTP_404_NOT_FOUND,
                )

            if not result_forecast_12h:
                return Response(
                    {"error": "No 12-hour forecast data available for this station."},
                    status=status.HTTP_404_NOT_FOUND,
                )

            latest_aqi = latest_station_reading.aqi_pm2_5

        return Response(
            {
                "aqi": latest_aqi,
                "forecast_6h": result_forecast_6h,
                "forecast_12h": result_forecast_12h,
            },
            status=status.HTTP_200_OK,
        )


def _region_aqi_payload(region_id):
    latest_region_reading = (
        RegionReadings.objects.filter(region_id=region_id).order_by("-date_utc").first()
    )
    if latest_region_reading is None:
        return None, Response(
            {"error": "No readings found for this region."},
            status=status.HTTP_404_NOT_FOUND,
        )

    _, forecast_6h, forecast_12h = _latest_region_forecasts(region_id)
    if not forecast_6h or not forecast_12h:
        return None, Response(
            {"error": "No forecast data available for this region."},
            status=status.HTTP_404_NOT_FOUND,
        )

    return {
        "aqi": latest_region_reading.aqi_region_avg,
        "forecast_6h": forecast_6h,
        "forecast_12h": forecast_12h,
    }, None


class NearestRegionView(generics.GenericAPIView):
    serializer_class = MapSerializer
    http_method_names = ["get"]

    def get(self, request, *args, **kwargs):
        lat_raw = request.query_params.get("lat")
        lon_raw = request.query_params.get("lon")

        if lat_raw is None and lon_raw is None:
            # No coordinates supplied (e.g. the mobile widget before the app has
            # been opened and location granted). Resolve an approximate location
            # from the request IP so the first render still shows a nearby region.
            coords = _ip_geolocate(_client_ip(request))
            if coords is None:
                return Response(
                    {"error": "Could not resolve a location for this request."},
                    status=status.HTTP_404_NOT_FOUND,
                )
            lat, lon = coords
        else:
            lat, lon, err = _parse_lat_lon(request)
            if err is not None:
                return err

        nearest_station, _ = _nearest_active_station(lat, lon)
        if nearest_station is None or nearest_station.region_id is None:
            return Response(
                {"error": "No region could be resolved for these coordinates."},
                status=status.HTTP_404_NOT_FOUND,
            )

        payload, err = _region_aqi_payload(nearest_station.region_id)
        if err is not None:
            return err

        payload["region_id"] = nearest_station.region_id
        return Response(payload, status=status.HTTP_200_OK)


class NearestStationView(generics.GenericAPIView):
    http_method_names = ["get"]

    def get(self, request, *args, **kwargs):
        lat, lon, err = _parse_lat_lon(request)
        if err is not None:
            return err

        nearest_station, distance_km = _nearest_active_station(lat, lon)
        if nearest_station is None:
            return Response(
                {"error": "No active station available."},
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response(
            {
                "id": nearest_station.id,
                "distance_km": distance_km,
            },
            status=status.HTTP_200_OK,
        )


class RegionViewset(ModelViewSet):
    queryset = Regions.objects.all()
    serializer_class = RegionSerializer
    http_method_names = ["get"]


class StationViewset(ModelViewSet):
    queryset = Stations.objects.all().order_by("id")
    serializer_class = StationSerializer
    http_method_names = ["get"]

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset().filter(
            latitude__isnull=False, longitude__isnull=False
        )
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["get"])
    def forecast(self, request, *args, **kwargs):
        station = self.get_object()
        last_inference = _latest_station_inference_result(station.id)

        if last_inference is None:
            return Response(
                {"error": "No forecast data available for this station."},
                status=status.HTTP_404_NOT_FOUND,
            )

        payload = {
            "forecast_date": last_inference.inference_run.run_date,
            "aqi_level": last_inference.aqi_input or [],
            "forecast_6h": last_inference.forecasts_6h or [],
            "forecast_12h": last_inference.forecasts_12h or [],
        }
        serializer = ForecastSerializer(data=payload)
        serializer.is_valid(raise_exception=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["get"])
    def boxplot(self, request, *args, **kwargs):
        station = self.get_object()
        period = request.query_params.get("period", "7d")

        now = timezone.now()
        if period == "7d":
            start_date = now - timedelta(days=7)
            trunc_func = TruncDate
        elif period == "30d":
            start_date = now - timedelta(days=30)
            trunc_func = TruncWeek
        elif period == "1y":
            start_date = now - timedelta(days=365)
            trunc_func = TruncMonth
        else:
            return Response(
                {"error": "Invalid period. Use '7d', '30d' or '1y'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        readings = (
            StationReadingsGold.objects.filter(
                station_id=station.id, date_utc__gte=start_date
            )
            .annotate(period=trunc_func("date_utc"))
            .values("period", "aqi_pm2_5")
        )

        period_values = defaultdict(list)
        for reading in readings:
            if reading["period"] is not None and reading["aqi_pm2_5"] is not None:
                period_values[reading["period"]].append(reading["aqi_pm2_5"])

        box_data = {
            "x": [],
            "q1": [],
            "median": [],
            "q3": [],
            "lowerfence": [],
            "upperfence": [],
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

            box_data["x"].append(period_value.strftime("%Y-%m-%d"))
            box_data["q1"].append(q1)
            box_data["median"].append(median_value)
            box_data["q3"].append(q3)
            box_data["lowerfence"].append(lowerfence)
            box_data["upperfence"].append(upperfence)

        return Response(box_data, status=status.HTTP_200_OK)


def _parse_bool(value):
    if value is None:
        return None
    return value.strip().lower() in {"1", "true", "yes", "on"}


@extend_schema_view(
    list=extend_schema(
        summary="List platform users",
        parameters=[
            OpenApiParameter(
                name="email",
                type=OpenApiTypes.STR,
                description="Filter by case-insensitive partial email match.",
            ),
            OpenApiParameter(
                name="role",
                type=OpenApiTypes.STR,
                enum=[choice.value for choice in UserRole],
                description="Filter by exact role.",
            ),
            OpenApiParameter(
                name="is_active",
                type=OpenApiTypes.BOOL,
                description="Filter by active status.",
            ),
        ],
    ),
    create=extend_schema(summary="Create a platform user"),
    retrieve=extend_schema(summary="Retrieve a platform user"),
    partial_update=extend_schema(summary="Update a platform user"),
    destroy=extend_schema(summary="Deactivate (soft delete) a platform user"),
)
@extend_schema(tags=["Admin Users"])
class AdminUserViewSet(ModelViewSet):
    """Administrative CRUD for platform users and their assigned roles.

    Restricted to authenticated users with the ``admin`` or ``superadmin`` role.
    """

    queryset = User.objects.select_related("profile").all().order_by("id")
    permission_classes = [IsAuthenticated, IsAdminRole]
    pagination_class = StandardResultsSetPagination
    http_method_names = ["get", "post", "patch", "delete"]

    def get_serializer_class(self):
        if self.action == "create":
            return AdminUserCreateSerializer
        if self.action in {"update", "partial_update"}:
            return AdminUserUpdateSerializer
        return AdminUserSerializer

    def get_queryset(self):
        queryset = super().get_queryset()

        email = self.request.query_params.get("email")
        if email:
            queryset = queryset.filter(email__icontains=email)

        role = self.request.query_params.get("role")
        if role:
            queryset = queryset.filter(profile__role=role)

        is_active = _parse_bool(self.request.query_params.get("is_active"))
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active)

        return queryset

    def perform_destroy(self, instance):
        """Soft delete: deactivate the account instead of removing the row."""
        instance.is_active = False
        instance.save(update_fields=["is_active"])

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance == request.user:
            raise PermissionDenied("You cannot delete your own account.")
        return super().destroy(request, *args, **kwargs)


def _dashboard_sensor(station):
    details = getattr(station, "details", None)
    last_reading = (
        StationReadingsGold.objects.filter(station_id=station.id)
        .order_by("-date_utc")
        .first()
    )
    return {
        "id": station.id,
        "name": station.name,
        "status": "online" if station.is_station_on else "offline",
        "location": {
            "city": details.city if details else None,
            "specific_location": details.specific_location if details else None,
            "latitude": station.latitude,
            "longitude": station.longitude,
        },
        "last_measurement_at": last_reading.date_utc if last_reading else None,
    }, last_reading


def _dashboard_air_quality(last_reading):
    if last_reading is None or last_reading.aqi_pm2_5 is None:
        return None
    level = classify_aqi(last_reading.aqi_pm2_5)
    return {
        "aqi": last_reading.aqi_pm2_5,
        "category": level["key"],
        "category_label": level["label"],
        "message": level["message"],
        "recommendations": level["recommendations"],
    }


def _dashboard_history(station):
    """Daily-averaged AQI for the trailing three months, oldest first.

    Aggregated by day (rather than raw readings) so three months of data
    stays a chart-sized payload instead of tens of thousands of points.
    """
    start_date = timezone.now() - relativedelta(months=3)
    rows = (
        StationReadingsGold.objects.filter(
            station_id=station.id, date_utc__gte=start_date, aqi_pm2_5__isnull=False
        )
        .annotate(day=TruncDate("date_utc"))
        .values("day")
        .annotate(aqi=Avg("aqi_pm2_5"))
        .order_by("day")
    )
    return [{"date": row["day"], "aqi": row["aqi"]} for row in rows]


def _dashboard_alert_config(institution):
    alert_config = getattr(institution, "alert_config", None)
    if alert_config is None:
        return {"is_enabled": False, "alert_threshold": None, "sensitive_groups": []}
    return {
        "is_enabled": alert_config.is_enabled,
        "alert_threshold": alert_config.alert_threshold,
        "sensitive_groups": list(alert_config.sensitive_groups.all()),
    }


def _build_institution_dashboard(institution):
    contract = getattr(institution, "contract", None)
    if contract is None:
        raise NotFound("This institution does not have an assigned sensor.")

    sensor, last_reading = _dashboard_sensor(contract.station)
    return {
        "sensor": sensor,
        "air_quality": _dashboard_air_quality(last_reading),
        "history": _dashboard_history(contract.station),
        "alert_config": _dashboard_alert_config(institution),
    }


@extend_schema(tags=["Institutional Dashboard"])
class InstitutionViewSet(ReadOnlyModelViewSet):
    """Self-service, read-only view of an institution's own dashboard data.

    Distinct from the Django Admin's Institution CRUD (backoffice-only,
    session-authenticated staff): this is what the institutional dashboard
    itself consumes. Access is limited to the institution the caller is
    linked to via ``InstitutionUser`` (see ``IsInstitutionUser`` /
    ``IsOwnInstitution``), never another institution's records.

    ``list`` is scoped through ``get_queryset`` — DRF does not run
    object-level permissions per row — while ``retrieve`` relies on
    ``IsOwnInstitution`` so requesting another institution's id by pk still
    returns 403 rather than leaking its existence via a 200.
    """

    serializer_class = InstitutionSerializer
    permission_classes = [IsAuthenticated, IsInstitutionUser, IsOwnInstitution]
    # "get" for list/retrieve/me, "post" for the login/logout actions below —
    # this viewset otherwise offers no write access to Institution itself.
    http_method_names = ["get", "post"]

    def get_queryset(self):
        if self.action == "list":
            institution = get_institution_for_user(self.request.user)
            if institution is None:
                return Institution.objects.none()
            return Institution.objects.filter(pk=institution.pk)
        return Institution.objects.all()

    @extend_schema(summary="Retrieve the caller's own institution")
    @action(detail=False, methods=["get"])
    def me(self, request, *args, **kwargs):
        institution = get_institution_for_user(request.user)
        serializer = self.get_serializer(institution)
        return Response(serializer.data)

    @extend_schema(
        summary="Retrieve the caller's institutional dashboard",
        description=(
            "Consolidated data for the Institution Dashboard: the assigned "
            "sensor, current air quality (AQI, category, interpretive "
            "message and recommendation), three months of measurement "
            "history, and the institution's alert configuration (enabled "
            "flag, AQI threshold and configured sensitive groups). The "
            "institution is resolved automatically from the authenticated "
            "user — never from a request parameter — so a caller can only "
            "ever retrieve their own institution's data. Returns 404 when "
            "the institution has no assigned sensor yet; `air_quality` is "
            "`null` when the sensor has not reported a measurement yet."
        ),
        responses=InstitutionDashboardSerializer,
    )
    @action(detail=False, methods=["get"])
    def dashboard(self, request, *args, **kwargs):
        institution = get_institution_for_user(request.user)
        payload = _build_institution_dashboard(institution)
        serializer = InstitutionDashboardSerializer(payload)
        return Response(serializer.data)

    @extend_schema(
        summary="List the alerts recorded for the caller's institution",
        description=(
            "Air-quality events recorded for the institution's own sensor, "
            "most recent first. Read-only: alerts are produced by the "
            "platform, not authored by institutions. This is what makes "
            "`ActionLog.alert` usable from a client — without it the field is "
            "writable but a caller has no way to discover a valid id."
        ),
        responses=InstitutionAlertSerializer(many=True),
    )
    @action(detail=False, methods=["get"], serializer_class=InstitutionAlertSerializer)
    def alerts(self, request, *args, **kwargs):
        """Scoped in the queryset, like ``list``.

        Registered as a router action rather than a plain path, which also
        settles the ordering problem: the router emits dynamic list routes
        before ``institution/{pk}/``, so "alerts" is never read as a pk.
        """
        institution = get_institution_for_user(request.user)
        queryset = (
            InstitutionAlert.objects.filter(institution=institution).select_related(
                "station"
            )
            if institution is not None
            else InstitutionAlert.objects.none()
        )

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @extend_schema(
        summary="Log in to the institutional dashboard",
        request=InstitutionLoginSerializer,
        responses=InstitutionSerializer,
    )
    @action(detail=False, methods=["post"], permission_classes=[AllowAny])
    def login(self, request, *args, **kwargs):
        """Authenticate and start a session, same as the admin login form.

        Kept off ``IsInstitutionUser``/``IsAuthenticated`` (unlike every other
        action here) since, by definition, the caller isn't authenticated yet.
        Institution membership is checked *after* credentials succeed, so a
        valid admin/staff login without an Institution link gets a 403 here
        rather than a session — this endpoint only ever signs a caller into
        their own institutional dashboard, never into the backoffice.
        """
        serializer = InstitutionLoginSerializer(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]

        institution = get_institution_for_user(user)
        if institution is None:
            raise PermissionDenied(
                "This account does not have access to an institutional dashboard."
            )

        auth_login(request, user)
        # Forces the CSRF cookie to be set on the response so the frontend can
        # send it back on subsequent unsafe (non-GET) requests in this session.
        get_token(request)
        return Response(InstitutionSerializer(institution).data)

    @extend_schema(summary="Log out of the institutional dashboard")
    @action(detail=False, methods=["post"])
    def logout(self, request, *args, **kwargs):
        auth_logout(request)
        return Response(status=status.HTTP_204_NO_CONTENT)


@extend_schema_view(
    list=extend_schema(
        summary="List the caller's institutional action history",
        description=(
            "Actions recorded by the authenticated user's institution, most "
            "recent first. The institution is resolved from the session, so "
            "the history never contains another institution's records."
        ),
    ),
    create=extend_schema(
        summary="Record an action taken by the caller's institution",
        description=(
            "Creates one entry in the institutional action history. "
            "`institution` and `timestamp` are assigned by the backend and "
            "ignored if sent. `station` must be the station the institution "
            "holds a contract for; `alert` is optional and, when given, must "
            "belong to the same institution and station."
        ),
    ),
)
@extend_schema(tags=["Institutional Dashboard"])
class ActionLogViewSet(mixins.CreateModelMixin, mixins.ListModelMixin, GenericViewSet):
    """Create and list an institution's record of actions taken.

    Deliberately create + list only: the action history is an audit trail, so
    entries are never edited or removed through the API — which is also why
    ``timestamp`` is stamped by the model rather than accepted from a client.

    Scoping works the same way as ``InstitutionViewSet``: ``get_queryset``
    filters the list down to the caller's own institution (DRF does not run
    object-level permissions per row), and the serializer refuses a station or
    alert belonging to anyone else on the way in.
    """

    serializer_class = ActionLogSerializer
    permission_classes = [IsAuthenticated, IsInstitutionUser]
    pagination_class = StandardResultsSetPagination
    http_method_names = ["get", "post"]

    def get_queryset(self):
        institution = get_institution_for_user(self.request.user)
        if institution is None:
            return ActionLog.objects.none()
        return ActionLog.objects.filter(institution=institution).select_related(
            "institution", "station", "alert"
        )

    def get_serializer_context(self):
        """Hand the caller's institution to the serializer's validation.

        Passed explicitly rather than re-resolved inside each validator, so the
        institution used for authorization is the same object the created row
        is assigned to.
        """
        context = super().get_serializer_context()
        context["institution"] = get_institution_for_user(self.request.user)
        return context

    def perform_create(self, serializer):
        serializer.save(institution=get_institution_for_user(self.request.user))


@extend_schema(
    responses=FaqCategorySerializer(many=True),
    description=(
        "Published FAQ categories with their published questions, ordered for "
        "display. Every question carries all supported languages; untranslated "
        "fields fall back to Spanish."
    ),
)
class FaqListView(generics.ListAPIView):
    """Public, read-only feed for the /recursos page.

    Unpublished categories and questions are filtered out here rather than in
    the frontend, so a draft is never shipped to the browser.
    """

    serializer_class = FaqCategorySerializer
    pagination_class = None

    def get_queryset(self):
        return (
            FaqCategory.objects.filter(is_published=True)
            .prefetch_related(
                Prefetch(
                    "questions",
                    queryset=FaqQuestion.objects.filter(is_published=True).order_by(
                        "order", "id"
                    ),
                )
            )
            .order_by("order", "id")
        )
