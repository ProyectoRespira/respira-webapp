from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0008_merge_0006_merge_0007_stations_station_code"),
    ]

    operations = [
        migrations.CreateModel(
            name="Institution",
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
                ("legal_name", models.CharField(max_length=255)),
                ("display_name", models.CharField(blank=True, max_length=255)),
                ("institution_type", models.CharField(blank=True, max_length=100)),
                ("contact_name", models.CharField(blank=True, max_length=255)),
                ("contact_email", models.EmailField(blank=True, max_length=254)),
                ("contact_phone", models.CharField(blank=True, max_length=50)),
                ("address", models.CharField(blank=True, max_length=255)),
                ("city", models.CharField(blank=True, max_length=255)),
                ("notes", models.TextField(blank=True)),
            ],
            options={
                "db_table": "institution",
            },
        ),
        migrations.CreateModel(
            name="InstitutionContract",
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
                (
                    "contract_status",
                    models.CharField(
                        choices=[
                            ("draft", "Draft"),
                            ("active", "Active"),
                            ("expired", "Expired"),
                            ("cancelled", "Cancelled"),
                        ],
                        default="draft",
                        max_length=20,
                    ),
                ),
                ("start_date", models.DateField()),
                ("end_date", models.DateField(blank=True, null=True)),
                (
                    "monthly_fee",
                    models.DecimalField(
                        blank=True, decimal_places=2, max_digits=10, null=True
                    ),
                ),
                ("signed_contract_url", models.URLField(blank=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "institution",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="contract",
                        to="api.institution",
                    ),
                ),
                (
                    "station",
                    models.OneToOneField(
                        db_constraint=False,
                        on_delete=django.db.models.deletion.DO_NOTHING,
                        related_name="institution_contract",
                        to="api.stations",
                    ),
                ),
            ],
            options={
                "db_table": "institution_contract",
            },
        ),
    ]
