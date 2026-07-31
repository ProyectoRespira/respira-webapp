from django.contrib import admin

from accounts.admin_base import ReadOnlyModelAdmin

from .models import Regions, Stations


@admin.register(Regions)
class RegionsViewer(ReadOnlyModelAdmin):
    list_display = ("name", "region_code", "has_weather_data", "has_pattern_station")
    search_fields = ("name", "region_code")
    ordering = ("name",)


@admin.register(Stations)
class StationsViewer(ReadOnlyModelAdmin):
    list_display = ("name", "region", "is_station_on", "is_pattern_station")
    list_filter = ("is_station_on", "is_pattern_station", "region")
    search_fields = ("name",)
    ordering = ("name",)
