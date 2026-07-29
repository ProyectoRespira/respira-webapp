from django.contrib import admin

from accounts.admin_base import ReadOnlyModelAdmin, RoleBasedModelAdmin

from .models import Regions, StationDetails, StationOverride, Stations


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
    search_fields = ("name",)
    ordering = ("name",)
    readonly_fields = (
        "name",
        "region",
        "latitude",
        "longitude",
        "is_station_on",
        "is_pattern_station",
    )
    fieldsets = (
        (None, {"fields": ("name", "region")}),
        ("Coordinates", {"fields": ("latitude", "longitude")}),
        ("Status", {"fields": ("is_station_on", "is_pattern_station")}),
    )
    inlines = (StationDetailsInline,)

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    def has_change_permission(self, request, obj=None):
        # Opens the station page for editing its inline details only; the
        # station's own fields stay read-only regardless.
        return request.user.has_perm("api.change_stationdetails")


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
