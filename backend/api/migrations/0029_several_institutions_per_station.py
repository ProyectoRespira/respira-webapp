# Lets one sensor be leased by several institutions.
#
# The mirror of 0028: there the UNIQUE index on `institution_id` went, so an
# institution could hold several sensors; here the one on `station_id` goes,
# so a sensor may appear in several institutions' contracts — a shared device,
# contracted by (say) a school and the municipality that installed it, each on
# its own term and its own fee.
#
# Widening, like 0028: every existing row is already valid under the looser
# rule, so there is no data migration and single-institution sensors keep
# working untouched.
#
# The composite UNIQUE on (institution_id, station_id) replaces it in the one
# sense still worth enforcing — one institution must not hold two contracts
# over the same sensor, which would double that sensor in the dashboard
# selector and in every notification fan-out. Added before the AlterField so
# the table is never briefly free of both indexes.
#
# What this deliberately gives up: the dropped index was what *structurally*
# guaranteed one institution could not read another's sensor. That now rests
# on the query layer — `get_institution_station_ids` and
# `resolve_institution_station` filter by the caller's own contracts and never
# trust a caller-supplied station id as a lookup.

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0028_several_stations_per_institution"),
    ]

    operations = [
        migrations.AddConstraint(
            model_name="institutioncontract",
            constraint=models.UniqueConstraint(
                fields=("institution", "station"),
                name="unique_institution_station_contract",
            ),
        ),
        migrations.AlterField(
            model_name="institutioncontract",
            name="station",
            field=models.ForeignKey(
                db_constraint=False,
                on_delete=django.db.models.deletion.DO_NOTHING,
                related_name="institution_contracts",
                to="api.stations",
            ),
        ),
    ]
