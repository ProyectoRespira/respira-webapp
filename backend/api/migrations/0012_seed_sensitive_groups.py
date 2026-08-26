"""Seeds the fixed sensitive-group catalog shared with respira-mobile.

Generated from `respira-mobile/src/constants/aqiLevels.ts`'s
`SENSITIVE_GROUPS_ALL`, so the institutional dashboard offers the same
options an institution's contact would recognize from the mobile app.

Idempotent by key, so re-running against a database that already has these
rows leaves admin edits untouched.
"""

from django.db import migrations

SEED = [
    {"key": "elderly", "label": "Adultos mayores", "emoji": "👴"},
    {"key": "heart_disease", "label": "Enfermedades cardíacas", "emoji": "🫀"},
    {"key": "lung_disease", "label": "Enfermedades pulmonares", "emoji": "🫁"},
    {"key": "infants", "label": "Bebés", "emoji": "👶"},
    {"key": "children", "label": "Niños", "emoji": "👧"},
    {"key": "diabetes", "label": "Diabetes", "emoji": "🍬"},
]


def seed_sensitive_groups(apps, schema_editor):
    SensitiveGroup = apps.get_model("api", "SensitiveGroup")
    for group in SEED:
        SensitiveGroup.objects.get_or_create(key=group["key"], defaults=group)


def unseed_sensitive_groups(apps, schema_editor):
    SensitiveGroup = apps.get_model("api", "SensitiveGroup")
    SensitiveGroup.objects.filter(key__in=[g["key"] for g in SEED]).delete()


class Migration(migrations.Migration):
    dependencies = [("api", "0011_institutionalertconfig_sensitivegroup")]

    operations = [migrations.RunPython(seed_sensitive_groups, unseed_sensitive_groups)]
