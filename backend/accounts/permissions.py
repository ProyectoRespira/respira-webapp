"""Role-based access control wiring for the Django Admin backoffice.

Each administrative ``Role`` is mapped to an ``auth.Group`` that carries the
model permissions for that role. Users inherit permissions through the group
synced to their role, so Django Admin's native ``has_*_permission`` checks
enforce access without any custom permission logic.

The permission matrix below is the single source of truth. Run
``manage.py sync_roles`` (or call :func:`sync_role_groups`) after migrations to
apply it.
"""

from __future__ import annotations

# Permission matrix: role slug -> either "__all__" or a mapping of
# (app_label, model_name) -> list of actions (add / change / delete / view).
#
# "Operational data" = api.stations, api.regions.
# "Editorial content" = api.faqcategory, api.faqquestion (public FAQ page).
# "Reflected dbt tables" = api.stations, api.regions — read-only for everyone.
# "Admin-owned station data" = api.stationdetails, api.stationoverride — the
# models that replace the operational spreadsheet and the status seed CSV, and
# the only station data that is editable from the backoffice.
# "Sensor Leasing data" = api.institution, api.institutioncontract — client
# organizations and their leasing contracts, admin-owned like the station data
# above.
# "Administrative configuration" = accounts.user, accounts.role.
#
# Note that `change_stationdetails` also gates opening a station's change page
# (see api.admin.StationsViewer), since the details are edited inline there.
ROLE_GROUP_PERMISSIONS: dict[str, object] = {
    # Superadmin: unrestricted administrative access.
    "superadmin": "__all__",
    # Admin: read the reflected dbt tables, manage admin-owned station data,
    # read administrative config, and fully manage editorial content.
    "admin": {
        ("api", "stations"): ["view"],
        ("api", "regions"): ["view"],
        ("api", "faqcategory"): ["add", "change", "delete", "view"],
        ("api", "faqquestion"): ["add", "change", "delete", "view"],
        ("api", "stationdetails"): ["add", "change", "view"],
        ("api", "stationoverride"): ["add", "change", "delete", "view"],
        ("api", "institution"): ["add", "change", "delete", "view"],
        ("api", "institutioncontract"): ["add", "change", "delete", "view"],
        ("accounts", "user"): ["view"],
        ("accounts", "role"): ["view"],
    },
    # Editor: edits admin-owned station data and editorial content, but never
    # the reflected dbt tables or administrative configuration. Deleting an
    # override remains an Admin decision.
    "editor": {
        ("api", "stations"): ["view"],
        ("api", "regions"): ["view"],
        ("api", "faqcategory"): ["add", "change", "view"],
        ("api", "faqquestion"): ["add", "change", "view"],
        ("api", "stationdetails"): ["add", "change", "view"],
        ("api", "stationoverride"): ["add", "change", "view"],
        ("api", "institution"): ["add", "change", "view"],
        ("api", "institutioncontract"): ["add", "change", "view"],
    },
    # Viewer: read-only on operational data, admin-owned station data, and
    # editorial content.
    "viewer": {
        ("api", "stations"): ["view"],
        ("api", "regions"): ["view"],
        ("api", "faqcategory"): ["view"],
        ("api", "faqquestion"): ["view"],
        ("api", "stationdetails"): ["view"],
        ("api", "stationoverride"): ["view"],
        ("api", "institution"): ["view"],
        ("api", "institutioncontract"): ["view"],
    },
}


def group_name_for_role(slug: str) -> str:
    """Deterministic Group name for a role slug (e.g. "superadmin" -> "Superadmin")."""
    return slug.capitalize()


ROLE_GROUP_NAMES = {group_name_for_role(slug) for slug in ROLE_GROUP_PERMISSIONS}


def sync_role_groups() -> None:
    """Create/refresh the auth.Group for each role and set its permissions.

    Idempotent. Requires model permissions to exist (i.e. run after migrations,
    once contenttypes/permissions have been populated).
    """
    from django.contrib.auth.models import Group, Permission
    from django.contrib.contenttypes.models import ContentType

    for slug, spec in ROLE_GROUP_PERMISSIONS.items():
        group, _ = Group.objects.get_or_create(name=group_name_for_role(slug))

        if spec == "__all__":
            group.permissions.set(Permission.objects.all())
            continue

        permissions = []
        for (app_label, model_name), actions in spec.items():  # type: ignore[union-attr]
            try:
                content_type = ContentType.objects.get(
                    app_label=app_label, model=model_name
                )
            except ContentType.DoesNotExist:
                continue
            for action in actions:
                codename = f"{action}_{model_name}"
                try:
                    permissions.append(
                        Permission.objects.get(
                            content_type=content_type, codename=codename
                        )
                    )
                except Permission.DoesNotExist:
                    continue
        group.permissions.set(permissions)


def sync_user_group(user) -> None:
    """Ensure the user belongs to exactly the group of their assigned role.

    Removes any other role-managed group so a role change does not leave stale
    permissions behind. Non-role groups are left untouched.
    """
    from django.contrib.auth.models import Group

    role = getattr(user, "role", None)
    if role is not None:
        target_name = group_name_for_role(role.slug)
        target_group, _ = Group.objects.get_or_create(name=target_name)
        stale = user.groups.filter(name__in=ROLE_GROUP_NAMES).exclude(name=target_name)
        if stale.exists():
            user.groups.remove(*stale)
        user.groups.add(target_group)
    else:
        managed = user.groups.filter(name__in=ROLE_GROUP_NAMES)
        if managed.exists():
            user.groups.remove(*managed)
