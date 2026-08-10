import os
import uuid

from django.conf import settings
from django.db import models
from django.utils import timezone


def _column_env_or_default(key: str, default: str) -> str:
    return (os.getenv(key) or "").strip() or default


class UserRole(models.TextChoices):
    VIEWER = "viewer", "Viewer"
    ADMIN = "admin", "Admin"
    SUPERADMIN = "superadmin", "Superadmin"


class UserProfile(models.Model):
    """Platform role attached to a standard Django auth user.

    Kept as a separate additive model (rather than swapping AUTH_USER_MODEL) so
    the feature deploys onto an already-migrated database without rewriting the
    existing auth history.
    """

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="profile",
    )
    role = models.CharField(
        max_length=20, choices=UserRole.choices, default=UserRole.VIEWER
    )

    class Meta:
        db_table = "user_profile"

    def __str__(self):
        return f"{self.user} ({self.role})"


def user_role(user) -> str:
    """Return the effective platform role of an auth user.

    Falls back to ``superadmin`` for Django superusers without a profile (so the
    bootstrap superuser can manage the platform) and ``viewer`` otherwise.
    """
    profile = getattr(user, "profile", None)
    if profile is not None:
        return profile.role
    if getattr(user, "is_superuser", False):
        return UserRole.SUPERADMIN
    return UserRole.VIEWER


class Regions(models.Model):
    name = models.CharField(max_length=255)
    region_code = models.CharField(max_length=255)
    bbox = models.CharField(max_length=255, blank=True, null=True)
    has_weather_data = models.BooleanField(default=False)
    has_pattern_station = models.BooleanField(
        db_column="has_pattern_data", default=False
    )

    class Meta:
        db_table = "regions"

    def __str__(self):
        return self.name


class Stations(models.Model):
    name = models.CharField(max_length=255)
    region = models.ForeignKey(
        "Regions", on_delete=models.DO_NOTHING, blank=True, null=True
    )
    latitude = models.FloatField(blank=True, null=True)
    longitude = models.FloatField(blank=True, null=True)
    is_station_on = models.BooleanField(default=False)
    is_pattern_station = models.BooleanField(default=False)

    class Meta:
        db_table = "stations"

    def __str__(self):
        return self.name

    @property
    def coordinates(self):
        return (self.latitude, self.longitude)


class StationDetails(models.Model):
    """Operational and contact information for a station, owned by the backend.

    Kept out of ``stations`` — which the dbt gold pipeline rewrites on every run
    — so operators can edit it from the admin without the next run overwriting
    it. Replaces the operational Google Spreadsheet.

    ``db_constraint=False``: dbt materializes ``stations`` as a table and drops
    and recreates it on every run, so a physical FOREIGN KEY would either break
    that run or be dropped with CASCADE. The one-to-one relationship (and its
    unique index) is enforced at the Django level instead.

    Note that ``stations.id`` is itself derived from a ``row_number()`` in dbt
    (``int_station_id_map``), so ids shift when a station is added. Re-linking
    details after such a shift requires exposing the stable ``station_code`` on
    the gold ``stations`` model — tracked separately in respira-data.
    """

    station = models.OneToOneField(
        "Stations",
        on_delete=models.DO_NOTHING,
        db_constraint=False,
        related_name="details",
    )
    serial_number = models.CharField(max_length=255, blank=True)
    sensor_type = models.CharField(max_length=255, blank=True)
    model = models.CharField(max_length=255, blank=True)
    city = models.CharField(max_length=255, blank=True)
    specific_location = models.CharField(max_length=255, blank=True)
    locality = models.CharField(max_length=255, blank=True)
    environment_type = models.CharField(max_length=255, blank=True)
    connectivity = models.CharField(max_length=255, blank=True)
    power_source = models.CharField(max_length=255, blank=True)
    installation_date = models.DateField(blank=True, null=True)
    responsible = models.CharField(max_length=255, blank=True)
    contact_info = models.TextField(blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        db_table = "station_details"
        verbose_name = "station details"
        verbose_name_plural = "station details"

    def __str__(self):
        return f"Details for {self.station.name}"


class StationOverride(models.Model):
    """An operational override of a station field, editable from the admin.

    Replaces ``station_status_seed.csv`` in respira-data: instead of committing
    a CSV and running dbt for every operational change, an operator creates a
    row here and the pipeline consumes it.

    Stations are addressed by ``station_code`` — the pipeline's stable natural
    key — rather than by ``stations.id``, which dbt regenerates from a
    ``row_number()`` on every run.

    ``processed`` is set by the pipeline once it has picked the change up, so it
    is system-managed and read-only in the admin.
    """

    station_code = models.CharField(max_length=255, db_index=True)
    field = models.CharField(max_length=255)
    value = models.CharField(max_length=255)
    note = models.TextField(blank=True)
    change_date = models.DateTimeField(default=timezone.now)
    processed = models.BooleanField(default=False)

    class Meta:
        db_table = "station_overrides"
        ordering = ("-change_date",)
        constraints = [
            models.UniqueConstraint(
                fields=["station_code", "field"],
                name="uniq_station_override_code_field",
            )
        ]

    def __str__(self):
        return f"{self.station_code}: {self.field} = {self.value}"


class RegionReadings(models.Model):
    region = models.ForeignKey("Regions", on_delete=models.DO_NOTHING)
    date_utc = models.DateTimeField()
    pm2_5_region_avg = models.FloatField(blank=True, null=True)
    pm2_5_region_max = models.FloatField(blank=True, null=True)
    pm2_5_region_skew = models.FloatField(blank=True, null=True)
    pm2_5_region_std = models.FloatField(blank=True, null=True)
    aqi_region_avg = models.FloatField(blank=True, null=True)
    aqi_region_max = models.FloatField(blank=True, null=True)
    aqi_region_skew = models.FloatField(blank=True, null=True)
    aqi_region_std = models.FloatField(blank=True, null=True)
    level_region_max = models.FloatField(blank=True, null=True)

    class Meta:
        db_table = "region_readings_gold"


class StationReadingsGold(models.Model):
    station = models.ForeignKey("Stations", on_delete=models.DO_NOTHING)
    airnow_id = models.IntegerField(blank=True, null=True)
    date_utc = models.DateTimeField(
        blank=True,
        null=True,
        db_column=_column_env_or_default(
            "BACKEND_STATION_READINGS_DATE_COLUMN", "date_localtime"
        ),
    )
    pm_calibrated = models.BooleanField(blank=True, null=True)
    pm1 = models.FloatField(blank=True, null=True)
    pm2_5 = models.FloatField(blank=True, null=True)
    pm10 = models.FloatField(blank=True, null=True)
    pm2_5_avg_6h = models.FloatField(blank=True, null=True)
    pm2_5_max_6h = models.FloatField(blank=True, null=True)
    pm2_5_skew_6h = models.FloatField(blank=True, null=True)
    pm2_5_std_6h = models.FloatField(blank=True, null=True)
    aqi_pm2_5 = models.FloatField(blank=True, null=True)
    aqi_pm10 = models.FloatField(blank=True, null=True)
    aqi_level = models.IntegerField(blank=True, null=True)
    aqi_pm2_5_max_24h = models.FloatField(blank=True, null=True)
    aqi_pm2_5_skew_24h = models.FloatField(blank=True, null=True)
    aqi_pm2_5_std_24h = models.FloatField(blank=True, null=True)

    class Meta:
        db_table = "station_readings_gold"


class InferenceRuns(models.Model):
    class Status(models.TextChoices):
        RUNNING = "running", "running"
        SUCCESS = "success", "success"
        FAILED = "failed", "failed"
        CANCELLED = "cancelled", "cancelled"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    run_date = models.DateTimeField(
        db_column="as_of",
    )
    flow_run_id = models.TextField()
    deployment = models.TextField(blank=True, null=True)
    window_hours = models.IntegerField()
    min_points = models.IntegerField()
    model_6h_version = models.TextField()
    model_12h_version = models.TextField()
    model_6h_path = models.TextField(blank=True, null=True)
    model_12h_path = models.TextField(blank=True, null=True)
    started_at = models.DateTimeField()
    ended_at = models.DateTimeField(blank=True, null=True)
    duration_s = models.IntegerField(blank=True, null=True)
    status = models.TextField(choices=Status.choices)
    stations_total = models.IntegerField(default=0)
    stations_success = models.IntegerField(default=0)
    stations_skipped = models.IntegerField(default=0)
    stations_failed = models.IntegerField(default=0)
    error_summary = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "inference_runs"


class InferenceResults(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    inference_run = models.ForeignKey("InferenceRuns", on_delete=models.DO_NOTHING)
    station = models.ForeignKey("Stations", on_delete=models.DO_NOTHING)
    forecasts_6h = models.JSONField(
        blank=True,
        null=True,
        db_column=_column_env_or_default(
            "BACKEND_INFERENCE_RESULTS_6H_COLUMN", "forecast_6h"
        ),
    )
    forecasts_12h = models.JSONField(
        blank=True,
        null=True,
        db_column=_column_env_or_default(
            "BACKEND_INFERENCE_RESULTS_12H_COLUMN", "forecast_12h"
        ),
    )
    aqi_input = models.JSONField(blank=True, null=True)

    class Meta:
        db_table = "inference_results"
