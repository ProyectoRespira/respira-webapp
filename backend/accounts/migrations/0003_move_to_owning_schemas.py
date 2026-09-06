"""Move accounts tables into the ``django_admin`` schema.

Table ownership used to be expressed only through PostgreSQL's search_path
order (``BACKEND_POSTGRES_SCHEMA``), which made resolution depend on schema
order rather than an explicit contract. ``db_table`` intentionally stays
unqualified here (Django's own introspection — used by ``flush``,
``dumpdata``/``loaddata``, and ``TransactionTestCase`` teardown — compares
``db_table`` against unqualified names from ``pg_catalog`` and silently stops
matching anything once ``db_table`` carries a schema prefix). Instead,
settings.DATABASES fixes search_path to ``django_admin, respira_gold,
public`` unconditionally — not configurable, not reorderable — and this
migration makes that safe by actually moving every accounts table into
``django_admin``, the schema search_path always checks first.

Purely a database-side move (no ``AlterModelTable``: ``db_table`` is not
changing, so there is nothing for Django's migration state to record).
RunPython, not RunSQL, so it can check each table's current schema first and
skip it if it is already in ``django_admin`` — safe to run against a fresh
test/dev/CI database (0001_initial just created these tables, unqualified,
wherever search_path pointed at the time) and against a production database
being upgraded in place.
"""

from django.db import migrations

TABLES = [
    "accounts_role",
    "accounts_user",
    "accounts_user_groups",
    "accounts_user_user_permissions",
]


def _move_tables(apps, schema_editor):
    # SQLite (local dev, and any run without BACKEND_POSTGRES_* configured)
    # has no notion of schemas: every table already lives in the single
    # namespace search_path would otherwise disambiguate, so there is
    # nothing to move.
    if schema_editor.connection.vendor != "postgresql":
        return
    with schema_editor.connection.cursor() as cursor:
        cursor.execute('CREATE SCHEMA IF NOT EXISTS "django_admin"')
        for table_name in TABLES:
            cursor.execute(
                """
                SELECT table_schema FROM information_schema.tables
                WHERE table_name = %s
                  AND table_schema NOT IN ('pg_catalog', 'information_schema')
                """,
                [table_name],
            )
            schemas = {row[0] for row in cursor.fetchall()}
            if "django_admin" in schemas or not schemas:
                continue
            source_schema = "public" if "public" in schemas else next(iter(schemas))
            cursor.execute(
                f'ALTER TABLE "{source_schema}"."{table_name}" '
                f'SET SCHEMA "django_admin"'
            )


def _reverse_noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0002_seed_roles"),
    ]

    operations = [
        migrations.RunPython(_move_tables, _reverse_noop),
    ]
