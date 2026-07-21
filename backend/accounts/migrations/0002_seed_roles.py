from django.db import migrations

DEFAULT_ROLES = [
    ("Superadmin", "superadmin", "Unrestricted administrative access."),
    ("Admin", "admin", "Manage stations and related operational models."),
    ("Editor", "editor", "Modify operational data without administrative configuration."),
    ("Viewer", "viewer", "Read-only access to administrative data."),
]


def seed_roles(apps, schema_editor):
    Role = apps.get_model("accounts", "Role")
    for name, slug, description in DEFAULT_ROLES:
        Role.objects.update_or_create(
            slug=slug,
            defaults={"name": name, "description": description},
        )


def unseed_roles(apps, schema_editor):
    Role = apps.get_model("accounts", "Role")
    Role.objects.filter(slug__in=[slug for _, slug, _ in DEFAULT_ROLES]).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(seed_roles, unseed_roles),
    ]
