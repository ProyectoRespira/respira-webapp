from django.contrib import admin, messages
from django.contrib.admin import helpers
from django.template.response import TemplateResponse
from django.utils import timezone

from accounts.admin_base import ReadOnlyModelAdmin, RoleBasedModelAdmin

from .forms import StationStatusOverrideForm
from .models import Regions, StationDetails, StationOverride, Stations

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
