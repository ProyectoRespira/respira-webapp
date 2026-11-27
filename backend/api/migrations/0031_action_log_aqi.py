# Records the station's AQI on each action log entry (#335).
#
# Stamped by the backend when the entry is created, from the station's latest
# gold reading — never accepted from a client — so the institutional history
# can show what the air was like when the action was taken.
#
# Nullable, with no backfill: entries recorded before this field existed have
# no trustworthy AQI to give them (the reading "at the time" would have to be
# reconstructed after the fact), and a station without a reading yet has none
# either. Clients render `null` as "no data".

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0030_institution_user_role"),
    ]

    operations = [
        migrations.AddField(
            model_name="actionlog",
            name="aqi",
            field=models.PositiveSmallIntegerField(
                blank=True,
                help_text=(
                    "AQI of the station's latest reading when the action was recorded."
                ),
                null=True,
            ),
        ),
    ]
