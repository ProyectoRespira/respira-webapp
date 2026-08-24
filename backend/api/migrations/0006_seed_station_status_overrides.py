"""Carry the rows of respira-data's station_status_seed.csv into the DB.

That CSV was the source of truth for manually shut-down stations. The pipeline
switches to reading ``station_overrides`` instead, so its rows have to exist in
the table *before* respira-data is deployed — otherwise the three stations it
holds off would come back on for one pipeline run.

The note text is copied verbatim from the CSV so the reason survives the move.
"""

from django.db import migrations

# station_code -> reason, from dbt/seeds/projects/respira_gold/station_status_seed.csv.
# (The product sheet lists "mades_open_0325360703" for the second one; no such
# code exists in respira-data, so the CSV's value is used.)
SEEDED_SHUTDOWNS = (
    (
        "airelibre_d87553",
        "FP-UNA SAN LORENZO: Station has inconsistent data and will not be "
        "used by Respira Paraguay",
    ),
    (
        "mades_open_ic08p0002",
        "Costanera Asunción: Station has been shut down by MADES request",
    ),
    (
        "mades_open_lvafyatdnok8ew",
        "Estación de Referencia de Parque Guazú: Station has been shut down by "
        "MADES request",
    ),
)

# StationOverride.STATUS_FIELD / Status.INACTIVE — spelled out because a
# migration must not import the live model.
STATUS_FIELD = "is_station_on"
INACTIVE = "inactive"


def seed_shutdowns(apps, schema_editor):
    StationOverride = apps.get_model("api", "StationOverride")
    for station_code, note in SEEDED_SHUTDOWNS:
        # update_or_create, not create: an override may already have been
        # recorded for one of these stations before this migration runs.
        StationOverride.objects.update_or_create(
            station_code=station_code,
            field=STATUS_FIELD,
            defaults={"value": INACTIVE, "note": note, "processed": False},
        )


def unseed_shutdowns(apps, schema_editor):
    StationOverride = apps.get_model("api", "StationOverride")
    StationOverride.objects.filter(
        station_code__in=[code for code, _ in SEEDED_SHUTDOWNS],
        field=STATUS_FIELD,
    ).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0005_stationoverride"),
    ]

    operations = [
        migrations.RunPython(seed_shutdowns, unseed_shutdowns),
    ]
