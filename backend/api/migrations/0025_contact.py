"""Add the centralized ``contact`` table.

Purely additive: nothing on ``accounts_user`` changes, so every existing user
keeps working with no contact attached. The optional user link lives on this
new table as a nullable ``OneToOneField`` — unique, so one contact can never
back two accounts, and ``SET_NULL``, so deleting a user releases the link
instead of deleting the contact.

No schema move is needed (cf. 0019_move_to_owning_schemas): ``contact`` is
Django-owned, and ``CREATE TABLE`` puts it in the first schema on the fixed
search_path, which is ``django_admin`` — where api/tests_schema_ownership.py
asserts every Django-owned table lives.
"""

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("api", "0024_several_alerts_per_sensor"),
    ]

    operations = [
        migrations.CreateModel(
            name="Contact",
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
                ("name", models.CharField(max_length=255)),
                ("description", models.TextField(blank=True)),
                ("institution", models.CharField(blank=True, max_length=255)),
                ("phone", models.CharField(blank=True, max_length=50)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "user",
                    models.OneToOneField(
                        blank=True,
                        help_text="Optional platform account for this contact.",
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="contact",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "verbose_name": "Contact",
                "verbose_name_plural": "Contacts",
                "db_table": "contact",
                "ordering": ["name"],
            },
        ),
    ]
