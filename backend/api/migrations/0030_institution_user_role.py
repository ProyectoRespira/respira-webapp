# Splits an institution's dashboard users into admins and members (#314).
#
# `role` is the user's role *inside their institution*, separate from the
# platform role on `user_profile` (`UserRole`, which gates the backoffice).
# Admins may write to the panel — record actions today, manage alert rules and
# the team later — and members only read it.
#
# Every existing link is backfilled as `admin` through the column default:
# before this migration every dashboard user could record actions, and nobody
# should lose that on deploy. Demoting someone is an explicit choice made in
# the admin afterwards.
#
# The `institution_type` change only adds help text naming the two values the
# panel tailors its copy to ("industria" / "colegio"); the column is untouched
# and stays free text. See `InstitutionType` in models.py for why it does not
# take `choices` yet.

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0029_several_institutions_per_station"),
    ]

    operations = [
        migrations.AddField(
            model_name="institutionuser",
            name="role",
            field=models.CharField(
                choices=[("admin", "Admin"), ("member", "Member (read-only)")],
                default="admin",
                help_text=(
                    "Admins can write to the institutional panel (e.g. record "
                    "actions); members can only read it."
                ),
                max_length=20,
            ),
        ),
        migrations.AlterField(
            model_name="institution",
            name="institution_type",
            field=models.CharField(
                blank=True,
                help_text=(
                    'The panel adapts its texts to "industria" or "colegio" '
                    "(lowercase, exactly as written); any other value gets the "
                    "generic texts."
                ),
                max_length=100,
            ),
        ),
    ]
