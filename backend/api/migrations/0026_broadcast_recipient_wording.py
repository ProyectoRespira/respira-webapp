"""Reword the broadcast recipient options; no data or schema change.

Metadata only. ``choices`` and ``help_text`` live in Django's migration state
rather than in Postgres, so this emits no DDL at all: the ``scope`` column
stays ``varchar(16)``, and the stored values — ``all``, ``station``,
``institution`` — are untouched. Every existing ``push_broadcast`` row keeps
its scope and keeps rendering correctly; only the label beside it changes.

It exists because Django compares model state against the last migration and
would otherwise report the app as having unapplied changes forever (which
.github/workflows/backend-migrations-check.yml fails on).

The reordering of ``choices`` puts ``all`` first, which changes the order the
admin renders the options in — deliberate, so the widest audience is chosen on
purpose rather than fallen into as the default.
"""

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0025_contact"),
    ]

    operations = [
        migrations.AlterField(
            model_name="pushbroadcast",
            name="institution",
            field=models.ForeignKey(
                blank=True,
                help_text="Set when notifying an institution's followers; blank for all users.",
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="broadcasts",
                to="api.institution",
            ),
        ),
        migrations.AlterField(
            model_name="pushbroadcast",
            name="scope",
            field=models.CharField(
                choices=[
                    ("all", "All users"),
                    ("station", "Followers of a specific sensor"),
                    ("institution", "Followers of an institution"),
                ],
                max_length=16,
            ),
        ),
        migrations.AlterField(
            model_name="pushbroadcast",
            name="station",
            field=models.ForeignKey(
                blank=True,
                db_constraint=False,
                help_text="Set when notifying one sensor's followers.",
                null=True,
                on_delete=django.db.models.deletion.DO_NOTHING,
                related_name="broadcasts",
                to="api.stations",
            ),
        ),
    ]
