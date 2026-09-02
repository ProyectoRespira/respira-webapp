"""Record why followers were notified, not only at what level.

Until now every row in the alert log was a warning, so the level alone said
what happened. A row can now also be an all-clear — where ``level: good`` on
its own would read as a warning about good air — or a catch-up sent to a single
installation that has just followed a station already over the threshold.

Existing rows default to ``worsening`` because that is what all of them were.
"""

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0017_sensor_alert_state_and_token_claim"),
    ]

    operations = [
        migrations.AddField(
            model_name="sensoralert",
            name="trend",
            field=models.CharField(
                choices=[
                    ("worsening", "Worsening"),
                    ("improving", "Improving"),
                    ("catch_up", "Catch-up on follow"),
                ],
                default="worsening",
                help_text=(
                    "Why followers were notified: the air got worse, it "
                    "improved, or one installation was caught up on a station "
                    "it just followed. Defaults to worsening: every row "
                    "predating this field was a warning."
                ),
                max_length=16,
            ),
        ),
    ]
