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
# "Administrative configuration" = accounts.user, accounts.role.
ROLE_GROUP_PERMISSIONS: dict[str, object] = {
    # Superadmin: unrestricted administrative access.
    "superadmin": "__all__",
    # Admin: manage station-related models, read administrative config.
    "admin": {
        ("api", "stations"): ["add", "change", "delete", "view"],
        ("api", "regions"): ["add", "change", "delete", "view"],
        ("accounts", "user"): ["view"],
        ("accounts", "role"): ["view"],
    },
    # Editor: modify operational data, no administrative configuration.
    "editor": {
        ("api", "stations"): ["change", "view"],
        ("api", "regions"): ["change", "view"],
    },
    # Viewer: read-only on operational data.
    "viewer": {
        ("api", "stations"): ["view"],
        ("api", "regions"): ["view"],
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
        stale = user.groups.filter(name__in=ROLE_GROUP_NAMES).exclude(
            name=target_name
        )
        if stale.exists():
            user.groups.remove(*stale)
        user.groups.add(target_group)
    else:
        managed = user.groups.filter(name__in=ROLE_GROUP_NAMES)
        if managed.exists():
            user.groups.remove(*managed)
