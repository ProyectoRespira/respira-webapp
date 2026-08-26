import os
import uuid
from typing import Any

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
    # The pipeline's stable natural key (``dim_stations.code``), exposed on the
    # gold table so operational records can address a station by something that
    # survives a rebuild — ``id`` comes from a ``row_number()`` in dbt and shifts
    # whenever a station is added. Written by dbt, never by the backend.
    station_code = models.CharField(max_length=255, blank=True, default="")
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


class Institution(models.Model):
    """A client organization in the Sensor Leasing program.

    Admin-owned, like ``StationDetails``: created and edited from the Django
    Admin, independent of the dbt-managed ``stations``/``regions`` tables.
    """

    legal_name = models.CharField(max_length=255)
    display_name = models.CharField(max_length=255, blank=True)
    institution_type = models.CharField(max_length=100, blank=True)
    contact_name = models.CharField(max_length=255, blank=True)
    contact_email = models.EmailField(blank=True)
    contact_phone = models.CharField(max_length=50, blank=True)
    address = models.CharField(max_length=255, blank=True)
    city = models.CharField(max_length=255, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        db_table = "institution"

    def __str__(self):
        return self.display_name or self.legal_name


class InstitutionContract(models.Model):
    """The leasing contract binding an :class:`Institution` to a station.

    ``institution`` is OneToOne so an institution has at most one contract.
    ``station`` mirrors :class:`StationDetails`: a plain ``OneToOneField`` with
    ``db_constraint=False``, since dbt drops and recreates ``stations`` on
    every gold run and a physical FOREIGN KEY would not survive that. The
    relationship (and its unique index) is enforced at the Django level, which
    is what guarantees a station is bound to at most one contract.
    """

    class ContractStatus(models.TextChoices):
        DRAFT = "draft", "Draft"
        ACTIVE = "active", "Active"
        EXPIRED = "expired", "Expired"
        CANCELLED = "cancelled", "Cancelled"

    institution = models.OneToOneField(
        "Institution", on_delete=models.CASCADE, related_name="contract"
    )
    station = models.OneToOneField(
        "Stations",
        on_delete=models.DO_NOTHING,
        db_constraint=False,
        related_name="institution_contract",
    )
    contract_status = models.CharField(
        max_length=20,
        choices=ContractStatus.choices,
        default=ContractStatus.DRAFT,
    )
    start_date = models.DateField()
    end_date = models.DateField(blank=True, null=True)
    monthly_fee = models.DecimalField(
        max_digits=10, decimal_places=2, blank=True, null=True
    )
    signed_contract_url = models.URLField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "institution_contract"

    def __str__(self):
        return f"{self.institution} — {self.station.name}"


class InstitutionUser(models.Model):
    """Grants a platform user access to a single Institution's private dashboard.

    Additive, mirroring ``UserProfile``: kept separate from ``accounts.User``
    instead of adding a field there, so this feature deploys without a
    migration on the core auth model. ``user`` is OneToOne — a user reaches at
    most one institution's data — while ``institution`` is a plain FK, since an
    institution may have more than one contact with dashboard access.
    """

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="institution_user",
    )
    institution = models.ForeignKey(
        "Institution", on_delete=models.CASCADE, related_name="users"
    )

    class Meta:
        db_table = "institution_user"

    def __str__(self):
        return f"{self.user} → {self.institution}"


def get_institution_for_user(user) -> "Institution | None":
    """Resolve the single Institution an authenticated user may access.

    Centralized so every institutional endpoint (and its tests) checks access
    the same way, rather than each view querying ``InstitutionUser`` directly.
    """
    if user is None or not getattr(user, "is_authenticated", False):
        return None
    link = getattr(user, "institution_user", None)
    return link.institution if link else None


def get_institution_station_ids(institution) -> set[int]:
    """Station ids an institution is entitled to act on.

    Today that is the single station bound by its :class:`InstitutionContract`
    — an institution leases at most one sensor. Centralized here (like
    :func:`get_institution_for_user`) so every institutional endpoint resolves
    "which stations are mine" identically, and so widening the rule later
    (several contracts per institution) is a one-place change.
    """
    if institution is None:
        return set()
    contract = getattr(institution, "contract", None)
    return {contract.station_id} if contract is not None else set()


class SensitiveGroup(models.Model):
    """Catalog of at-risk population groups an institution can flag for alerts.

    Mirrors the fixed list respira-mobile ships in ``aqiLevels.ts``
    (``SENSITIVE_GROUPS_ALL``), kept as a table rather than a
    ``TextChoices`` so it is manageable from the admin instead of a code
    deploy, and can back a proper many-to-many selection per institution.
    """

    key = models.SlugField(max_length=50, unique=True)
    label = models.CharField(max_length=100)
    emoji = models.CharField(max_length=8, blank=True)

    class Meta:
        db_table = "sensitive_group"
        ordering = ("label",)

    def __str__(self):
        return self.label


class InstitutionAlertConfig(models.Model):
    """An institution's own configuration for institutional air-quality alerts.

    OneToOne, like ``InstitutionContract``: an institution has at most one
    alert configuration. Absent entirely for institutions that never opted
    into alerts — callers resolve that case to a controlled default instead
    of treating it as an error.
    """

    institution = models.OneToOneField(
        "Institution", on_delete=models.CASCADE, related_name="alert_config"
    )
    is_enabled = models.BooleanField(default=False)
    alert_threshold = models.PositiveIntegerField(
        blank=True,
        null=True,
        help_text="AQI value above which an alert is triggered.",
    )
    sensitive_groups: "models.ManyToManyField[SensitiveGroup, Any]" = (
        models.ManyToManyField(
            "SensitiveGroup", blank=True, related_name="alert_configs"
        )
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "institution_alert_config"

    def __str__(self):
        return f"Alert config for {self.institution}"


class InstitutionAlert(models.Model):
    """A poor-air-quality event recorded for an institution's station.

    Records that an institution's AQI threshold was actually crossed, so an
    :class:`ActionLog` entry can point at the event it responded to. The
    threshold itself is per-institution configuration, tracked separately.

    Nothing writes these automatically yet — alerts are computed client-side in
    respira-mobile and never stored — so rows are created from the admin until
    an alert generator exists. Adding one is purely additive: it neither reads
    nor changes the existing notification path.

    ``station`` mirrors :class:`InstitutionContract`: ``db_constraint=False``
    because dbt drops and recreates ``stations`` on every gold run, so a
    physical FOREIGN KEY would not survive it.
    """

    institution = models.ForeignKey(
        "Institution", on_delete=models.CASCADE, related_name="alerts"
    )
    station = models.ForeignKey(
        "Stations",
        on_delete=models.DO_NOTHING,
        db_constraint=False,
        related_name="institution_alerts",
    )
    aqi_value = models.FloatField(
        help_text="AQI reading that triggered the alert.",
    )
    alert_threshold = models.PositiveIntegerField(
        blank=True,
        null=True,
        help_text=(
            "Threshold in force when the alert fired, copied from the "
            "institution's alert configuration so later edits to that "
            "configuration don't rewrite history."
        ),
    )
    triggered_at = models.DateTimeField(default=timezone.now)
    resolved_at = models.DateTimeField(
        blank=True,
        null=True,
        help_text="Left empty while the event is still ongoing.",
    )

    class Meta:
        db_table = "institution_alert"
        ordering = ("-triggered_at", "-id")

    def __str__(self):
        return f"{self.institution} — AQI {self.aqi_value} at {self.triggered_at:%Y-%m-%d %H:%M}"


class ActionLog(models.Model):
    """An action an institution took in response to an air quality event.

    The institutional audit trail: what was decided or done, when, on which
    station, and — when applicable — which alert prompted it. Written through
    the institutional API (never by the pipeline), which is why ``timestamp``
    is ``auto_now_add``: the backend stamps it, and no client can backdate an
    entry.

    Deletion behaviour follows what each relationship means for the record:

    * ``institution`` cascades — the history belongs to the institution and has
      no meaning once the institution is gone (same as ``InstitutionContract``
      and ``InstitutionUser``).
    * ``station`` is ``DO_NOTHING`` with ``db_constraint=False``, like every
      other backend-owned model pointing at the dbt-managed ``stations``.
    * ``alert`` is ``SET_NULL`` — the alert is context, not the record's
      subject. Removing an alert must not erase the fact that the institution
      acted, so the entry survives as an action without a linked alert.
    """

    institution = models.ForeignKey(
        "Institution", on_delete=models.CASCADE, related_name="action_logs"
    )
    station = models.ForeignKey(
        "Stations",
        on_delete=models.DO_NOTHING,
        db_constraint=False,
        related_name="action_logs",
    )
    alert = models.ForeignKey(
        "InstitutionAlert",
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="action_logs",
        help_text="Optional: the alert this action responded to.",
    )
    timestamp = models.DateTimeField(auto_now_add=True)
    note = models.TextField(help_text="The action taken by the institution.")

    class Meta:
        db_table = "action_log"
        # Most recent action first, as the institutional history is read.
        # ``-id`` breaks ties so two entries written in the same instant (a
        # realistic case for a stamped-by-the-server timestamp) still come back
        # in a stable, newest-first order.
        ordering = ("-timestamp", "-id")

    def __str__(self):
        return f"{self.institution} — {self.timestamp:%Y-%m-%d %H:%M}"


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

    ``field``/``value`` are deliberately free-form so any station column can be
    overridden. The activate/deactivate workflow is one such override, pinned to
    ``STATUS_FIELD`` with a :class:`Status` value — hence the constants rather
    than ``choices`` on the field itself.
    """

    # The station column the activate/deactivate workflow overrides.
    STATUS_FIELD = "is_station_on"

    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        INACTIVE = "inactive", "Inactive"

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


# --- FAQ (public /recursos page) -------------------------------------------
#
# Admin-owned content: unlike stations/regions (written by the dbt pipeline and
# exposed through ReadOnlyModelAdmin), these rows are created and edited from the
# Django Admin, so they use RoleBasedModelAdmin.
#
# Translations are stored as one column per language rather than a separate
# translations table. The site ships a closed set of three languages, fixed by
# the frontend's language selector, so six columns keep the admin form a single
# screen where a language can be neither duplicated nor silently omitted.

# Must stay in sync with the frontend's `i18n/config.ts`.
FAQ_LANGS = ("es", "en", "pt")
FAQ_DEFAULT_LANG = "es"


def faq_localized(instance, field: str, lang: str) -> str:
    """Return ``<field>_<lang>``, falling back to Spanish when untranslated.

    Mirrors the frontend's ``useTranslations`` fallback: a question nobody has
    translated yet renders in Spanish instead of as an empty accordion row.
    """
    if lang not in FAQ_LANGS:
        lang = FAQ_DEFAULT_LANG
    value = (getattr(instance, f"{field}_{lang}", "") or "").strip()
    if value:
        return value
    return (getattr(instance, f"{field}_{FAQ_DEFAULT_LANG}", "") or "").strip()


def faq_localized_map(instance, field: str) -> dict[str, str]:
    """Return ``{lang: text}`` for every supported language, fallback applied."""
    return {lang: faq_localized(instance, field, lang) for lang in FAQ_LANGS}


def faq_missing_langs(instance, field: str) -> list[str]:
    """Languages where ``<field>_<lang>`` is blank (i.e. still untranslated)."""
    return [
        lang
        for lang in FAQ_LANGS
        if lang != FAQ_DEFAULT_LANG
        and not (getattr(instance, f"{field}_{lang}", "") or "").strip()
    ]


class FaqCategory(models.Model):
    """A group of FAQ questions, rendered as one section on /recursos."""

    slug = models.SlugField(
        max_length=64,
        unique=True,
        help_text=(
            "Anchor used in the public URL (e.g. #sensor). Changing it breaks "
            "links people have already shared."
        ),
    )
    order = models.PositiveIntegerField(
        default=0,
        db_index=True,
        help_text="Sections are shown from lowest to highest.",
    )
    is_published = models.BooleanField(
        default=True,
        help_text="Unpublished categories are hidden from the public page.",
    )

    label_es = models.CharField(max_length=120)
    label_en = models.CharField(max_length=120, blank=True)
    label_pt = models.CharField(max_length=120, blank=True)

    class Meta:
        db_table = "faq_category"
        ordering = ["order", "id"]
        verbose_name = "FAQ category"
        verbose_name_plural = "FAQ categories"

    def __str__(self):
        return self.label_es


class FaqQuestion(models.Model):
    """A single question/answer pair inside a :class:`FaqCategory`.

    Answers are plain text: the page renders them with ``white-space: pre-line``,
    so a newline is a line break and a leading "• " makes a bullet. No markup is
    interpreted, which keeps admin-authored content safe to render as-is.
    """

    category = models.ForeignKey(
        FaqCategory, on_delete=models.CASCADE, related_name="questions"
    )
    order = models.PositiveIntegerField(
        default=0,
        db_index=True,
        help_text="Questions are shown from lowest to highest within a category.",
    )
    is_published = models.BooleanField(
        default=True,
        help_text="Unpublished questions are hidden from the public page.",
    )

    question_es = models.CharField(max_length=300)
    answer_es = models.TextField()
    question_en = models.CharField(max_length=300, blank=True)
    answer_en = models.TextField(blank=True)
    question_pt = models.CharField(max_length=300, blank=True)
    answer_pt = models.TextField(blank=True)

    class Meta:
        db_table = "faq_question"
        ordering = ["category__order", "order", "id"]
        verbose_name = "FAQ question"
        verbose_name_plural = "FAQ questions"

    def __str__(self):
        return self.question_es
