"""Add the ``push_notification_window`` configuration table.

Purely additive, and Django-owned: no gold table is touched, so ``CREATE
TABLE`` puts it in the first schema on the fixed search_path — ``django_admin``,
where api/tests_schema_ownership.py asserts every Django-owned table lives
(cf. 0019_move_to_owning_schemas).

No row is created here. ``PushNotificationWindow.current()`` creates it on
first read with the agreed 06:00–22:00 America/Asuncion defaults, which keeps
the defaults in one place — the model — rather than duplicating them in a data
migration that would then drift from it.

Until that first read the table is empty, and an empty table means no window
row exists; the senders call ``current()``, so the first alerting run after
this deploy creates it and is itself restricted. That is the intended
behaviour: the feature ships on, not off.
"""

import datetime
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0026_broadcast_recipient_wording"),
    ]

    operations = [
        migrations.CreateModel(
            name="PushNotificationWindow",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                (
                    "is_enabled",
                    models.BooleanField(
                        default=True,
                        help_text="When off, notifications are delivered at any hour and the times below are ignored.",
                    ),
                ),
                (
                    "start_time",
                    models.TimeField(
                        default=datetime.time(6, 0),
                        help_text="Earliest hour a notification may be delivered (inclusive).",
                    ),
                ),
                (
                    "end_time",
                    models.TimeField(
                        default=datetime.time(22, 0),
                        help_text="Latest hour a notification may be delivered (exclusive).",
                    ),
                ),
                (
                    "timezone_name",
                    models.CharField(
                        default="America/Asuncion",
                        help_text="The zone the times above are read in. The server clock runs on UTC, so this is what makes them local hours.",
                        max_length=64,
                    ),
                ),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "verbose_name": "Push notification window",
                "verbose_name_plural": "Push notification window",
                "db_table": "push_notification_window",
            },
        ),
    ]
