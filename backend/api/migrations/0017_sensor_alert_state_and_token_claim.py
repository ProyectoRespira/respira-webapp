"""Give alerting its own state, and make a live push token unique.

Two corrections to the shape 0015/0016 left behind.

The alert log was doing double duty as the sender's memory, which meant it only
ever remembered levels it had alerted on: a station that alerted at
``hazardous`` and later recovered still looked like it was at ``hazardous``,
and since nothing outranks that it could never alert again. ``SensorAlertState``
holds the last level actually seen — safe ones included — separately from the
audit log.

And ``DeviceInstallation.register`` claimed a push token by clearing it from
everyone else, which two concurrent registrations of the same token can both do
without seeing each other. A partial unique index makes the database refuse the
second one so the retry can clear the winner's row properly.
"""

from django.db import migrations, models
from django.utils import timezone


def release_duplicate_tokens(apps, schema_editor):
    """Leave each live token on one installation, so the index can be created.

    Existing rows predate the constraint, and 0015 copied a token onto every
    installation it created, so duplicates are possible. The most recently
    updated holder keeps it: that is the installation the device most likely
    registered from last, and it is the one the old code would have left the
    token on anyway.
    """
    DeviceInstallation = apps.get_model("api", "DeviceInstallation")

    duplicated = (
        DeviceInstallation.objects.exclude(push_token="")
        # `order_by()` clears the model's default ordering, which would
        # otherwise join `updated_at` into the GROUP BY and make every row its
        # own group — no duplicate would ever be found.
        .order_by()
        .values("push_token")
        .annotate(holders=models.Count("id"))
        .filter(holders__gt=1)
        .values_list("push_token", flat=True)
    )

    now = timezone.now()
    for token in list(duplicated):
        keeper = (
            DeviceInstallation.objects.filter(push_token=token)
            .order_by("-updated_at", "-id")
            .first()
        )
        DeviceInstallation.objects.filter(push_token=token).exclude(
            pk=keeper.pk
        ).update(push_token="", updated_at=now)


def seed_alert_state(apps, schema_editor):
    """Carry the existing dedup state over from the alert log.

    Without this the first run after deploy would find no state for any station
    and re-alert every one that is currently over a threshold — the duplicate
    notification this whole mechanism exists to prevent. The last recorded
    alert is exactly what the old code compared against, so seeding both fields
    from it makes the deploy a no-op for stations that are already alerting.
    """
    SensorAlert = apps.get_model("api", "SensorAlert")
    SensorAlertState = apps.get_model("api", "SensorAlertState")

    seen = set()
    for alert in SensorAlert.objects.order_by("-sent_at", "-id").iterator():
        if alert.station_code in seen:
            continue
        seen.add(alert.station_code)
        SensorAlertState.objects.update_or_create(
            station_code=alert.station_code,
            defaults={
                "last_level": alert.level,
                "last_alerted_level": alert.level,
            },
        )


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0016_sensor_alert"),
    ]

    operations = [
        # Cleared first: the index below cannot be created while two rows still
        # hold the same token. Reversing is a no-op — the constraint goes away,
        # and re-duplicating tokens on the way back would only recreate the bug.
        migrations.RunPython(release_duplicate_tokens, migrations.RunPython.noop),
        migrations.AddConstraint(
            model_name="deviceinstallation",
            constraint=models.UniqueConstraint(
                condition=models.Q(("push_token", ""), _negated=True),
                fields=("push_token",),
                name="uniq_active_push_token",
            ),
        ),
        migrations.CreateModel(
            name="SensorAlertState",
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
                    "station_code",
                    models.CharField(
                        help_text="The pipeline's stable natural key for the station.",
                        max_length=255,
                        unique=True,
                    ),
                ),
                (
                    "last_level",
                    models.CharField(
                        blank=True,
                        default="",
                        help_text=(
                            "AQI level key of the most recent reading, "
                            "alert-worthy or not."
                        ),
                        max_length=32,
                    ),
                ),
                (
                    "last_alerted_level",
                    models.CharField(
                        blank=True,
                        default="",
                        help_text=(
                            "Level of the last alert that reached a device; blank "
                            "once the station drops back below the alert threshold."
                        ),
                        max_length=32,
                    ),
                ),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "db_table": "sensor_alert_state",
                "ordering": ("station_code",),
            },
        ),
        # Reversing drops the table with it, so there is nothing to undo.
        migrations.RunPython(seed_alert_state, migrations.RunPython.noop),
    ]
