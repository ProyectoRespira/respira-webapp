import copy

from django.db import migrations, models
from django.utils import timezone


def _default_value_for_field(field_name):
    field_defaults = {
        "flow_run_id": "",
        "model_6h_version": "",
        "model_12h_version": "",
        "status": "running",
        "window_hours": 0,
        "min_points": 0,
        "stations_total": 0,
        "stations_success": 0,
        "stations_skipped": 0,
        "stations_failed": 0,
    }
    return field_defaults.get(field_name)


def _sync_inference_runs_columns(apps, schema_editor):
    model = apps.get_model("api", "InferenceRuns")
    connection = schema_editor.connection
    table_name = model._meta.db_table

    def _existing_columns():
        with connection.cursor() as cursor:
            table_description = connection.introspection.get_table_description(
                cursor, table_name
            )
        return {
            connection.introspection.identifier_converter(column.name)
            for column in table_description
        }

    fields_to_ensure = [
        "flow_run_id",
        "deployment",
        "window_hours",
        "min_points",
        "model_6h_version",
        "model_12h_version",
        "model_6h_path",
        "model_12h_path",
        "started_at",
        "ended_at",
        "duration_s",
        "status",
        "stations_total",
        "stations_success",
        "stations_skipped",
        "stations_failed",
        "error_summary",
        "created_at",
    ]

    def _add_field_safely(field_name):
        field = model._meta.get_field(field_name)
        existing_columns = _existing_columns()
        column_name = connection.introspection.identifier_converter(field.column)

        if column_name in existing_columns:
            return

        add_field = field
        if not field.null:
            add_field = copy.deepcopy(field)
            add_field.null = True

        schema_editor.add_field(model, add_field)

        if not field.null:
            default_value = (
                field.get_default()
                if field.has_default()
                else _default_value_for_field(field_name)
            )
            if default_value is not None:
                quoted_table = connection.ops.quote_name(table_name)
                quoted_column = connection.ops.quote_name(field.column)
                with connection.cursor() as cursor:
                    cursor.execute(
                        f"UPDATE {quoted_table} SET {quoted_column} = %s WHERE {quoted_column} IS NULL",
                        [default_value],
                    )

            schema_editor.alter_field(model, add_field, field)

    for field_name in fields_to_ensure:
        _add_field_safely(field_name)


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0001_initial"),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.AlterField(
                    model_name="inferenceruns",
                    name="run_date",
                    field=models.DateTimeField(db_column="as_of"),
                ),
                migrations.AddField(
                    model_name="inferenceruns",
                    name="created_at",
                    field=models.DateTimeField(default=timezone.now),
                ),
                migrations.AddField(
                    model_name="inferenceruns",
                    name="deployment",
                    field=models.TextField(blank=True, null=True),
                ),
                migrations.AddField(
                    model_name="inferenceruns",
                    name="duration_s",
                    field=models.IntegerField(blank=True, null=True),
                ),
                migrations.AddField(
                    model_name="inferenceruns",
                    name="ended_at",
                    field=models.DateTimeField(blank=True, null=True),
                ),
                migrations.AddField(
                    model_name="inferenceruns",
                    name="error_summary",
                    field=models.TextField(blank=True, null=True),
                ),
                migrations.AddField(
                    model_name="inferenceruns",
                    name="flow_run_id",
                    field=models.TextField(default=""),
                    preserve_default=False,
                ),
                migrations.AddField(
                    model_name="inferenceruns",
                    name="min_points",
                    field=models.IntegerField(default=0),
                    preserve_default=False,
                ),
                migrations.AddField(
                    model_name="inferenceruns",
                    name="model_12h_path",
                    field=models.TextField(blank=True, null=True),
                ),
                migrations.AddField(
                    model_name="inferenceruns",
                    name="model_12h_version",
                    field=models.TextField(default=""),
                    preserve_default=False,
                ),
                migrations.AddField(
                    model_name="inferenceruns",
                    name="model_6h_path",
                    field=models.TextField(blank=True, null=True),
                ),
                migrations.AddField(
                    model_name="inferenceruns",
                    name="model_6h_version",
                    field=models.TextField(default=""),
                    preserve_default=False,
                ),
                migrations.AddField(
                    model_name="inferenceruns",
                    name="started_at",
                    field=models.DateTimeField(default=timezone.now),
                    preserve_default=False,
                ),
                migrations.AddField(
                    model_name="inferenceruns",
                    name="stations_failed",
                    field=models.IntegerField(default=0),
                ),
                migrations.AddField(
                    model_name="inferenceruns",
                    name="stations_skipped",
                    field=models.IntegerField(default=0),
                ),
                migrations.AddField(
                    model_name="inferenceruns",
                    name="stations_success",
                    field=models.IntegerField(default=0),
                ),
                migrations.AddField(
                    model_name="inferenceruns",
                    name="stations_total",
                    field=models.IntegerField(default=0),
                ),
                migrations.AddField(
                    model_name="inferenceruns",
                    name="status",
                    field=models.TextField(
                        choices=[
                            ("running", "running"),
                            ("success", "success"),
                            ("failed", "failed"),
                            ("cancelled", "cancelled"),
                        ],
                        default="running",
                    ),
                    preserve_default=False,
                ),
                migrations.AddField(
                    model_name="inferenceruns",
                    name="window_hours",
                    field=models.IntegerField(default=0),
                    preserve_default=False,
                ),
            ],
            database_operations=[],
        ),
        migrations.RunPython(_sync_inference_runs_columns, migrations.RunPython.noop),
    ]
