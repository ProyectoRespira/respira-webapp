"""Move the MADES PM limits from settings into an admin-editable table.

Until now they were ``settings.MADES_PM_LIMITS``. Staff now edit them in the
admin (``MadesPmLimits``), so a limit MADES confirms or changes no longer
waits for a deploy.

Purely additive and Django-owned, like 0027_push_notification_window: the
table lands in ``django_admin``, the first schema on the fixed search_path.

Unlike 0027, the row *is* created here, with exactly the values the setting
held, so ``/api/institution/me/`` answers the same right after migrating.
0027 could leave its row to ``current()`` because its defaults are the model's
field defaults; these limits have no defaults to fall back to (``NULL`` means
"not confirmed", see the model), and a row created lazily would be all-null —
the panel would lose the two confirmed limits on deploy.

The values are written here rather than imported from anywhere so this
migration keeps producing the same row after the setting is gone. Reversing
drops the table; the seed has nothing to undo on its own.
"""

from decimal import Decimal

import django.core.validators
from django.db import migrations, models


# The values ``settings.MADES_PM_LIMITS`` held when this table replaced it.
# ``None`` = not confirmed yet (#333).
SEED = {
    "pm25_h24": None,
    "pm25_annual": Decimal("40"),
    "pm10_h24": Decimal("150"),
    "pm10_annual": None,
}


def seed_limits(apps, schema_editor):
    MadesPmLimits = apps.get_model("api", "MadesPmLimits")
    # The historical model has no custom ``save()``, so the singleton id is
    # spelled out. get_or_create keeps a re-run from touching edited values.
    MadesPmLimits.objects.get_or_create(id=1, defaults=SEED)


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0031_action_log_aqi"),
    ]

    operations = [
        migrations.CreateModel(
            name="MadesPmLimits",
            fields=[
                (
                    "id",
                    models.PositiveSmallIntegerField(
                        default=1, editable=False, primary_key=True, serialize=False
                    ),
                ),
                (
                    "pm25_h24",
                    models.DecimalField(
                        blank=True,
                        decimal_places=1,
                        help_text='µg/m³, per MADES Resolución 259/2015. Leave blank while the value is not confirmed: the panel then shows "A confirmar" instead of a number.',
                        max_digits=6,
                        null=True,
                        validators=[django.core.validators.MinValueValidator(0)],
                        verbose_name="PM2.5, 24-hour average",
                    ),
                ),
                (
                    "pm25_annual",
                    models.DecimalField(
                        blank=True,
                        decimal_places=1,
                        help_text='µg/m³, per MADES Resolución 259/2015. Leave blank while the value is not confirmed: the panel then shows "A confirmar" instead of a number.',
                        max_digits=6,
                        null=True,
                        validators=[django.core.validators.MinValueValidator(0)],
                        verbose_name="PM2.5, annual average",
                    ),
                ),
                (
                    "pm10_h24",
                    models.DecimalField(
                        blank=True,
                        decimal_places=1,
                        help_text='µg/m³, per MADES Resolución 259/2015. Leave blank while the value is not confirmed: the panel then shows "A confirmar" instead of a number.',
                        max_digits=6,
                        null=True,
                        validators=[django.core.validators.MinValueValidator(0)],
                        verbose_name="PM10, 24-hour average",
                    ),
                ),
                (
                    "pm10_annual",
                    models.DecimalField(
                        blank=True,
                        decimal_places=1,
                        help_text='µg/m³, per MADES Resolución 259/2015. Leave blank while the value is not confirmed: the panel then shows "A confirmar" instead of a number.',
                        max_digits=6,
                        null=True,
                        validators=[django.core.validators.MinValueValidator(0)],
                        verbose_name="PM10, annual average",
                    ),
                ),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "verbose_name": "MADES PM limits",
                "verbose_name_plural": "MADES PM limits",
                "db_table": "mades_pm_limits",
                "constraints": [
                    models.CheckConstraint(
                        condition=models.Q(("id", 1)), name="mades_pm_limits_singleton"
                    )
                ],
            },
        ),
        migrations.RunPython(seed_limits, migrations.RunPython.noop),
    ]
