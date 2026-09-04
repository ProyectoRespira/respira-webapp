"""Move api tables into their explicit owning schemas.

Table ownership used to be expressed only through PostgreSQL's search_path
order (``BACKEND_POSTGRES_SCHEMA``): with e.g. ``django_admin,respira_gold``
configured, an unqualified table name resolved to whichever schema
search_path checked first, and a same-named table (or an accidental one) in
the wrong schema could silently redirect reads or writes.

``db_table`` intentionally stays unqualified (Django's own introspection —
used by ``flush``, ``dumpdata``/``loaddata``, and ``TransactionTestCase``
teardown — compares ``db_table`` against unqualified names from
``pg_catalog`` and silently stops matching anything once ``db_table`` carries
a schema prefix, which breaks those commands and every test that flushes
between cases). Instead, settings.DATABASES now fixes search_path to
``django_admin, respira_gold, public`` unconditionally — not configurable,
not reorderable by ``BACKEND_POSTGRES_SCHEMA`` — and this migration makes
that safe by actually moving every table into the schema search_path always
checks for it:

* ``django_admin``: every Django-owned model (auth, admin, accounts, and the
  operational models in api/models.py — institutions, station overrides,
  device followers, sensor alerts, FAQs, ...).
* ``respira_gold``: every model backed by a data-pipeline table — dbt SQL for
  ``regions``/``stations``/``station_readings_gold``/``region_readings_gold``,
  the Prefect inference flow for ``inference_runs``/``inference_results``.
  These are additionally marked ``ReadOnlyGoldModel`` (api/gold.py), which
  blocks writes to them from the backend ORM regardless of search_path.

Because no ``django_admin`` table shares a name with a ``respira_gold``
table (see the regression test in api/tests_schema_ownership.py, which fails
if that ever stops being true), a fixed, non-configurable search_path order
cannot introduce ambiguity: reordering it would still resolve every table to
the same place.

Purely a database-side move — no ``AlterModelTable``, since ``db_table`` is
not changing. RunPython, not RunSQL, so each table moves only if it is not
already in its target schema:

* Fresh test/dev/CI databases: 0001_initial just created these tables
  unqualified whever search_path pointed at the time, so this migration
  creates ``django_admin`` (``respira_gold`` too, in case nothing has
  materialized it yet) and moves everything into place.
* Production/staging: ``django_admin`` is created (it did not exist before);
  Django-owned tables move there. ``respira_gold`` tables are typically
  already in ``respira_gold`` — dbt creates that schema itself and has been
  materializing these tables there — so their move is a no-op.
"""

from django.db import migrations

DJANGO_ADMIN_TABLES = [
    "action_log",
    "device_follower",
    "device_installation",
    "faq_category",
    "faq_question",
    "institution",
    "institution_alert",
    "institution_alert_config",
    "institution_alert_config_sensitive_groups",
    "institution_contract",
    "institution_user",
    "sensitive_group",
    "sensor_alert",
    "sensor_alert_state",
    "station_details",
    "station_overrides",
    "user_profile",
]

RESPIRA_GOLD_TABLES = [
    "inference_results",
    "inference_runs",
    "region_readings_gold",
    "regions",
    "station_readings_gold",
    "stations",
]


def _ensure_schemas(apps, schema_editor):
    with schema_editor.connection.cursor() as cursor:
        cursor.execute('CREATE SCHEMA IF NOT EXISTS "django_admin"')
        cursor.execute('CREATE SCHEMA IF NOT EXISTS "respira_gold"')


def _move_tables(target_schema, table_names):
    def _move(apps, schema_editor):
        with schema_editor.connection.cursor() as cursor:
            for table_name in table_names:
                cursor.execute(
                    """
                    SELECT table_schema FROM information_schema.tables
                    WHERE table_name = %s
                      AND table_schema NOT IN ('pg_catalog', 'information_schema')
                    """,
                    [table_name],
                )
                schemas = {row[0] for row in cursor.fetchall()}
                if target_schema in schemas or not schemas:
                    continue
                source_schema = (
                    "public" if "public" in schemas else next(iter(schemas))
                )
                cursor.execute(
                    f'ALTER TABLE "{source_schema}"."{table_name}" '
                    f'SET SCHEMA "{target_schema}"'
                )

    return _move


def _reverse_noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0018_sensor_alert_trend"),
    ]

    operations = [
        migrations.RunPython(_ensure_schemas, _reverse_noop),
        migrations.RunPython(
            _move_tables("django_admin", DJANGO_ADMIN_TABLES), _reverse_noop
        ),
        migrations.RunPython(
            _move_tables("respira_gold", RESPIRA_GOLD_TABLES), _reverse_noop
        ),
    ]
