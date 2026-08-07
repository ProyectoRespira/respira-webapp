from django.contrib import admin
from django.db.models import Count

from accounts.admin_base import ReadOnlyModelAdmin, RoleBasedModelAdmin

from .models import (
    FaqCategory,
    FaqQuestion,
    Regions,
    Stations,
    faq_missing_langs,
)


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
