from django.contrib import admin, messages
from django.contrib.admin import helpers
from django.db.models import Count, OuterRef, Subquery
from django.template.response import TemplateResponse
from django.utils import timezone

from accounts.admin_base import ReadOnlyModelAdmin, RoleBasedModelAdmin

from .forms import StationStatusOverrideForm
from .models import (
    DeviceFollower,
    FaqCategory,
    FaqQuestion,
    Institution,
    InstitutionAlertConfig,
    InstitutionContract,
    InstitutionUser,
    Regions,
    SensitiveGroup,
    StationDetails,
    StationOverride,
    Stations,
    faq_missing_langs,
)

# Shown after every activation/deactivation: the override row is written
# immediately, but `stations.is_station_on` is only rewritten by the pipeline.
DBT_RUN_NOTICE = "Changes to station status require a dbt run to take effect."

# What each action actually does downstream. `stations.is_station_on` is derived
# by the pipeline as "the source reports the station active AND it has reported
# recently"; an override only forces the first half to false. So deactivating
# holds a station off, while activating merely stops holding it off — it cannot
# bring back a station that has gone silent.
STATUS_EXPLANATION = {
    "inactive": (
        "The station will be held inactive: the pipeline excludes it from the "
        "public map regardless of the data it reports."
    ),
    "active": (
        "The forced shutdown is lifted. The station returns only if its source "
        "still reports it as active and it has been sending data recently — "
        "activating it here does not bring back a sensor that stopped reporting."
    ),
}


@admin.register(Regions)
class RegionsViewer(ReadOnlyModelAdmin):
    list_display = ("name", "region_code", "has_weather_data", "has_pattern_station")
    search_fields = ("name", "region_code")
    ordering = ("name",)


class StationDetailsInline(admin.StackedInline):
    """Operational details edited from the station page.

    ``StationDetails`` has no changelist of its own — a details record only
    makes sense next to its station, so the station page is the single place
    operators manage it (replacing the operational spreadsheet).
    """

    model = StationDetails
    can_delete = False
    # One blank form when a station has no details yet, so the operator lands
    # straight on the fields instead of having to click "Add another".
    extra = 1
    verbose_name_plural = "Station details"
    fieldsets = (
        ("Hardware", {"fields": ("serial_number", "sensor_type", "model")}),
        (
            "Location",
            {"fields": ("city", "locality", "specific_location", "environment_type")},
        ),
        (
            "Installation",
            {"fields": ("connectivity", "power_source", "installation_date")},
        ),
        ("Contact", {"fields": ("responsible", "contact_info")}),
        ("Notes", {"fields": ("notes",)}),
    )


@admin.register(Stations)
class StationsViewer(RoleBasedModelAdmin):
    """Station page: the station itself is immutable, its details are not.

    ``stations`` is written by the dbt gold pipeline, so every one of its own
    fields is in ``readonly_fields`` and add/delete are disabled for everyone —
    a record can never be edited into a state the next pipeline run overwrites.

    It cannot extend ``ReadOnlyModelAdmin`` like ``RegionsViewer`` does, though:
    Django refuses to save inlines when the parent denies change permission, and
    the DoD requires editing StationDetails from this page. Change permission is
    therefore granted on the details model instead — "you may open this station
    to edit its details" — never on the station fields themselves.
    """

    list_display = ("name", "region", "is_station_on", "is_pattern_station")
    list_filter = ("is_station_on", "is_pattern_station", "region")
    search_fields = ("name", "station_code")
    ordering = ("name",)
    readonly_fields = (
        "name",
        "station_code",
        "region",
        "latitude",
        "longitude",
        "is_station_on",
        "is_pattern_station",
    )
    fieldsets = (
        (None, {"fields": ("name", "region")}),
        ("Pipeline", {"fields": ("station_code",)}),
        ("Coordinates", {"fields": ("latitude", "longitude")}),
        ("Status", {"fields": ("is_station_on", "is_pattern_station")}),
    )
    inlines = (StationDetailsInline,)
    actions = ("activate_stations", "deactivate_stations")
    status_override_template = "admin/api/stations/status_override_confirmation.html"

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    def has_change_permission(self, request, obj=None):
        # Opens the station page for editing its inline details only; the
        # station's own fields stay read-only regardless.
        return request.user.has_perm("api.change_stationdetails")

    def has_override_permission(self, request):
        """Gate for the activate/deactivate actions (``permissions=["override"]``).

        The actions write ``StationOverride`` rows and never touch ``stations``,
        so they are keyed on that model's permissions — not on this one's, which
        grants no write access to anybody.
        """
        return request.user.has_perm(
            "api.add_stationoverride"
        ) and request.user.has_perm("api.change_stationoverride")

    @admin.action(description="Activate selected stations", permissions=["override"])
    def activate_stations(self, request, queryset):
        return self._override_status(request, queryset, StationOverride.Status.ACTIVE)

    @admin.action(description="Deactivate selected stations", permissions=["override"])
    def deactivate_stations(self, request, queryset):
        return self._override_status(request, queryset, StationOverride.Status.INACTIVE)

    def _override_status(self, request, queryset, value):
        """Confirm, then record the requested status as a ``StationOverride``.

        Two passes through the same action, the way Django's own
        ``delete_selected`` works: the first renders a confirmation page asking
        for the mandatory reason, the second (carrying ``confirm``) writes the
        overrides and returns ``None`` so the admin redirects back to the list.

        ``stations`` is never written here — the pipeline propagates the change
        on its next run, which is what ``DBT_RUN_NOTICE`` tells the operator.
        """
        stations = list(queryset.order_by("name"))

        unmapped = [station for station in stations if not station.station_code]
        if unmapped:
            # An override is keyed by station code, so a station without one
            # cannot be addressed at all. Refuse the whole selection rather than
            # applying it to part of it, so the operator sees one consistent
            # outcome instead of a silent partial change.
            self.message_user(
                request,
                "No station code on: "
                + ", ".join(str(station) for station in unmapped)
                + ". The pipeline sets it; wait for the next dbt run.",
                messages.ERROR,
            )
            return None

        confirmed = bool(request.POST.get("confirm"))
        form = (
            StationStatusOverrideForm(request.POST)
            if confirmed
            else StationStatusOverrideForm()
        )
        if confirmed and form.is_valid():
            self._write_status_overrides(stations, value, form.cleaned_data["note"])
            self.message_user(
                request,
                f"{len(stations)} station override(s) recorded as "
                f"{value.label.lower()}.",
                messages.SUCCESS,
            )
            self.message_user(request, DBT_RUN_NOTICE, messages.INFO)
            return None

        context = {
            **self.admin_site.each_context(request),
            "title": f"{value.label} stations",
            "opts": self.opts,
            "media": self.media + form.media,
            "selection": stations,
            "form": form,
            "action": (
                "activate_stations"
                if value == StationOverride.Status.ACTIVE
                else "deactivate_stations"
            ),
            "action_label": value.label.lower(),
            "action_explanation": STATUS_EXPLANATION[value],
            "dbt_run_notice": DBT_RUN_NOTICE,
            "action_checkbox_name": helpers.ACTION_CHECKBOX_NAME,
        }
        return TemplateResponse(request, self.status_override_template, context)

    @staticmethod
    def _write_status_overrides(stations, value, note):
        change_date = timezone.now()
        for station in stations:
            StationOverride.objects.update_or_create(
                station_code=station.station_code,
                field=StationOverride.STATUS_FIELD,
                defaults={
                    "value": value,
                    "note": note,
                    "change_date": change_date,
                    # Re-deciding a status means the pipeline has to pick the row
                    # up again, even if it had already consumed the previous one.
                    "processed": False,
                },
            )


class UntranslatedListFilter(admin.SimpleListFilter):
    """Filters rows still missing a translation in a given language.

    Spanish is the source language and always required, so it is not offered as
    an option. Subclasses set ``fields`` to the untranslated column prefixes.
    """

    title = "pending translation"
    parameter_name = "untranslated"
    fields: tuple[str, ...] = ()

    def lookups(self, request, model_admin):
        return (("en", "Missing English"), ("pt", "Missing Portuguese"))

    def queryset(self, request, queryset):
        lang = self.value()
        if lang not in ("en", "pt"):
            return queryset
        for field in self.fields:
            queryset = queryset.filter(**{f"{field}_{lang}": ""})
        return queryset


class CategoryUntranslatedFilter(UntranslatedListFilter):
    fields = ("label",)


class QuestionUntranslatedFilter(UntranslatedListFilter):
    fields = ("question",)


@admin.register(FaqCategory)
class FaqCategoryAdmin(RoleBasedModelAdmin):
    """Sections of the public FAQ page.

    Admin-owned content (see docs/django-admin-conventions.md): unlike the
    reflected dbt tables, these rows are created and edited here, so this
    extends RoleBasedModelAdmin rather than ReadOnlyModelAdmin.
    """

    list_display = ("label_es", "slug", "order", "is_published", "question_count")
    list_filter = ("is_published", CategoryUntranslatedFilter)
    search_fields = ("slug", "label_es", "label_en", "label_pt")
    ordering = ("order", "id")
    list_editable = ("order", "is_published")
    fieldsets = (
        (None, {"fields": ("slug", "order", "is_published")}),
        (
            "Español",
            {
                "fields": ("label_es",),
                "description": (
                    "Source language: always required. The other languages fall "
                    "back to this text until they are filled in."
                ),
            },
        ),
        ("English", {"fields": ("label_en",)}),
        ("Português", {"fields": ("label_pt",)}),
    )

    def get_queryset(self, request):
        return super().get_queryset(request).annotate(_questions=Count("questions"))

    @admin.display(description="Questions", ordering="_questions")
    def question_count(self, obj):
        return obj._questions


@admin.register(FaqQuestion)
class FaqQuestionAdmin(RoleBasedModelAdmin):
    """Question/answer pairs shown on the public FAQ page.

    Answers are plain text: a newline is a line break and a leading "• " renders
    as a bullet. No markup is interpreted.
    """

    list_display = (
        "question_es",
        "category",
        "order",
        "is_published",
        "pending_translations",
    )
    list_filter = ("is_published", "category", QuestionUntranslatedFilter)
    search_fields = (
        "question_es",
        "question_en",
        "question_pt",
        "answer_es",
        "answer_en",
        "answer_pt",
    )
    ordering = ("category__order", "order", "id")
    list_select_related = ("category",)
    list_editable = ("order", "is_published")
    autocomplete_fields = ("category",)
    fieldsets = (
        (None, {"fields": ("category", "order", "is_published")}),
        (
            "Español",
            {
                "fields": ("question_es", "answer_es"),
                "description": (
                    "Source language: always required. The other languages fall "
                    "back to this text until they are filled in."
                ),
            },
        ),
        ("English", {"fields": ("question_en", "answer_en")}),
        ("Português", {"fields": ("question_pt", "answer_pt")}),
    )

    @admin.display(description="Pending translation")
    def pending_translations(self, obj):
        missing = set(faq_missing_langs(obj, "question"))
        missing |= set(faq_missing_langs(obj, "answer"))
        if not missing:
            return "—"
        return ", ".join(lang.upper() for lang in sorted(missing))


class InstitutionUserInline(admin.TabularInline):
    """Users granted access to this institution's private dashboard.

    Lives on the Institution page rather than as its own changelist — an
    institution-user link only makes sense in the context of its institution,
    same reasoning as ``StationDetailsInline`` on the station page.
    """

    model = InstitutionUser
    extra = 1
    autocomplete_fields = ("user",)
    verbose_name = "Dashboard user"
    verbose_name_plural = "Dashboard users"


class InstitutionAlertConfigInline(admin.StackedInline):
    """Alert configuration edited from the institution page.

    ``InstitutionAlertConfig`` has no changelist of its own — same reasoning
    as ``StationDetailsInline`` — and a config only makes sense alongside its
    institution.
    """

    model = InstitutionAlertConfig
    can_delete = False
    extra = 1
    filter_horizontal = ("sensitive_groups",)
    readonly_fields = ("created_at", "updated_at")


@admin.register(Institution)
class InstitutionAdmin(RoleBasedModelAdmin):
    """Client organizations in the Sensor Leasing program."""

    list_display = ("legal_name", "display_name", "institution_type", "city")
    list_filter = ("institution_type", "city")
    search_fields = ("legal_name", "display_name", "contact_name", "contact_email")
    ordering = ("legal_name",)
    inlines = (InstitutionUserInline, InstitutionAlertConfigInline)
    fieldsets = (
        (None, {"fields": ("legal_name", "display_name", "institution_type")}),
        (
            "Contact",
            {"fields": ("contact_name", "contact_email", "contact_phone")},
        ),
        ("Location", {"fields": ("address", "city")}),
        ("Notes", {"fields": ("notes",)}),
    )


@admin.register(SensitiveGroup)
class SensitiveGroupAdmin(RoleBasedModelAdmin):
    """Fixed catalog of at-risk groups institutions can flag for alerts."""

    list_display = ("label", "key", "emoji")
    search_fields = ("label", "key")
    ordering = ("label",)


@admin.register(InstitutionContract)
class InstitutionContractAdmin(RoleBasedModelAdmin):
    """Leasing contracts binding an Institution to a station.

    ``institution`` and ``station`` are each OneToOne, so the admin's own
    unique index (not custom validation) is what prevents an institution or a
    station from being attached to more than one contract.
    """

    list_display = (
        "institution",
        "station",
        "contract_status",
        "start_date",
        "end_date",
        "monthly_fee",
    )
    list_filter = ("contract_status",)
    search_fields = (
        "institution__legal_name",
        "institution__display_name",
        "station__name",
    )
    ordering = ("-start_date",)
    autocomplete_fields = ("institution", "station")
    readonly_fields = ("created_at", "updated_at")
    fieldsets = (
        (None, {"fields": ("institution", "station", "contract_status")}),
        ("Term", {"fields": ("start_date", "end_date", "monthly_fee")}),
        ("Document", {"fields": ("signed_contract_url",)}),
        ("Audit", {"fields": ("created_at", "updated_at")}),
    )


class HasPushTokenFilter(admin.SimpleListFilter):
    """Splits followers by whether the app has registered a push token yet.

    The operational question behind it: a follower with no token is following
    a station but cannot be notified, so this is how that gap gets spotted.
    """

    title = "push token"
    parameter_name = "has_push_token"

    def lookups(self, request, model_admin):
        return (("yes", "Registered"), ("no", "Missing"))

    def queryset(self, request, queryset):
        if self.value() == "yes":
            return queryset.exclude(push_token="")
        if self.value() == "no":
            return queryset.filter(push_token="")
        return queryset


@admin.register(DeviceFollower)
class DeviceFollowerAdmin(RoleBasedModelAdmin):
    """Mobile installations and the station each one follows.

    Written exclusively by the device-follower API, so add and change are
    disabled: a follower row is a device's own state, and editing it here
    would silently point somebody's phone at a different sensor without the
    app ever knowing. Delete stays available under the normal role matrix, so
    a data-removal request can be honoured.

    Rows address their station by ``station_code``, not by a foreign key, so
    the station's name is resolved with a subquery rather than a join — one
    query for the whole changelist instead of one per row.
    """

    list_display = (
        "installation_id",
        "station_code",
        "station_name",
        "masked_push_token",
        "updated_at",
    )
    list_filter = (HasPushTokenFilter, "station_code", "updated_at")
    search_fields = ("installation_id", "station_code", "push_token")
    ordering = ("-updated_at",)
    readonly_fields = (
        "installation_id",
        "station_code",
        "station_name",
        "push_token",
        "created_at",
        "updated_at",
    )
    fieldsets = (
        (None, {"fields": ("installation_id",)}),
        ("Followed station", {"fields": ("station_code", "station_name")}),
        ("Notifications", {"fields": ("push_token",)}),
        ("Audit", {"fields": ("created_at", "updated_at")}),
    )

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def get_queryset(self, request):
        station_names = Stations.objects.filter(
            station_code=OuterRef("station_code")
        ).values("name")[:1]
        return (
            super()
            .get_queryset(request)
            .annotate(_station_name=Subquery(station_names))
        )

    @admin.display(description="Station", ordering="_station_name")
    def station_name(self, obj):
        # Annotated on the changelist; resolved directly on the detail page,
        # which loads the object without going through get_queryset's annotation.
        name = getattr(obj, "_station_name", None)
        if name is None:
            station = obj.station
            name = station.name if station else None
        # An unknown code means the pipeline dropped the station the device
        # follows — worth showing as such rather than as an empty cell.
        return name or "unknown station"

    @admin.display(description="Push token")
    def masked_push_token(self, obj):
        """Show only enough of the token to tell two of them apart.

        Full tokens are 150+ characters and would swamp the changelist; the
        detail page carries the real value for anyone debugging delivery.
        """
        if not obj.push_token:
            return "—"
        return f"…{obj.push_token[-8:]}"


@admin.register(StationOverride)
class StationOverrideAdmin(RoleBasedModelAdmin):
    """Operational overrides consumed by the dbt pipeline.

    Replaces editing ``station_status_seed.csv`` by hand.
    """

    list_display = ("station_code", "field", "value", "change_date", "processed")
    list_filter = ("processed", "field")
    search_fields = ("station_code", "value", "note")
    ordering = ("-change_date",)
    # Set by the pipeline once it has consumed the override.
    readonly_fields = ("processed",)
    fieldsets = (
        (None, {"fields": ("station_code", "field", "value")}),
        ("Context", {"fields": ("note", "change_date")}),
        ("Pipeline", {"fields": ("processed",)}),
    )
