from django.contrib import admin
from django.db.models import Count

from accounts.admin_base import ReadOnlyModelAdmin, RoleBasedModelAdmin

from .models import (
    FaqCategory,
    FaqQuestion,
    Regions,
    StationDetails,
    StationOverride,
    Stations,
    faq_missing_langs,
)


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
