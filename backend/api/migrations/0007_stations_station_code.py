"""Teach Django about ``stations.station_code`` without fighting dbt for it.

The gold pipeline materializes ``stations`` as a table and drops and recreates
it on every run, so the column is added by respira-data (``stations.sql``), not
here. A plain ``AddField`` would either collide with the column dbt has already
created in production, or add one that the next run throws away.

So the schema change is state-only, exactly as
``0002_align_inference_runs_schema`` does for ``inference_runs``. The RunPython
step then adds the column only where it is genuinely missing — which is the
test/dev database, built from these migrations rather than by dbt.
"""

from django.db import migrations, models


def _add_station_code_if_missing(apps, schema_editor):
    model = apps.get_model("api", "Stations")
    connection = schema_editor.connection
    field = model._meta.get_field("station_code")

    with connection.cursor() as cursor:
        table_description = connection.introspection.get_table_description(
            cursor, model._meta.db_table
        )
    existing_columns = {
        connection.introspection.identifier_converter(column.name)
        for column in table_description
    }

    column_name = connection.introspection.identifier_converter(field.column)
    if column_name not in existing_columns:
        schema_editor.add_field(model, field)


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0006_seed_station_status_overrides"),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.AddField(
                    model_name="stations",
                    name="station_code",
                    field=models.CharField(blank=True, default="", max_length=255),
                ),
            ],
            database_operations=[],
        ),
        migrations.RunPython(_add_station_code_if_missing, migrations.RunPython.noop),
    ]
