from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.test import RequestFactory, TestCase

from accounts.models import Role
from accounts.permissions import (
    ROLE_GROUP_NAMES,
    group_name_for_role,
    sync_role_groups,
)
from api.admin import RegionsAdmin, StationsAdmin
from api.models import Regions, Stations
from django.contrib import admin

User = get_user_model()


class RoleGroupSyncTests(TestCase):
    def setUp(self):
        sync_role_groups()

    def test_groups_created_for_every_role(self):
        for name in ROLE_GROUP_NAMES:
            self.assertTrue(Group.objects.filter(name=name).exists(), name)

    def test_superadmin_group_has_all_permissions(self):
        from django.contrib.auth.models import Permission

        group = Group.objects.get(name=group_name_for_role("superadmin"))
        self.assertEqual(group.permissions.count(), Permission.objects.count())

    def test_viewer_group_is_read_only_on_operational_models(self):
        group = Group.objects.get(name=group_name_for_role("viewer"))
        codenames = set(group.permissions.values_list("codename", flat=True))
        self.assertIn("view_stations", codenames)
        self.assertIn("view_regions", codenames)
        self.assertNotIn("change_stations", codenames)
        self.assertNotIn("delete_stations", codenames)
        self.assertNotIn("add_stations", codenames)

    def test_editor_group_can_change_but_not_delete_or_admin_config(self):
        group = Group.objects.get(name=group_name_for_role("editor"))
        codenames = set(group.permissions.values_list("codename", flat=True))
        self.assertIn("change_stations", codenames)
        self.assertIn("view_stations", codenames)
        self.assertNotIn("delete_stations", codenames)
        # No access to administrative configuration (users/roles).
        self.assertFalse({c for c in codenames if c.endswith("_user")})
        self.assertFalse({c for c in codenames if c.endswith("_role")})

    def test_admin_group_manages_stations_and_reads_config(self):
        group = Group.objects.get(name=group_name_for_role("admin"))
        codenames = set(group.permissions.values_list("codename", flat=True))
        for action in ("add", "change", "delete", "view"):
            self.assertIn(f"{action}_stations", codenames)
        self.assertIn("view_user", codenames)
        self.assertNotIn("delete_user", codenames)


class UserRoleGroupSignalTests(TestCase):
    def setUp(self):
        sync_role_groups()

    def test_assigning_role_adds_user_to_group_and_sets_staff(self):
        editor = Role.objects.get(slug="editor")
        user = User.objects.create_user(
            email="editor@example.com", password="pw-Str0ng!42", role=editor
        )
        user.refresh_from_db()
        self.assertTrue(user.is_staff)
        self.assertTrue(
            user.groups.filter(name=group_name_for_role("editor")).exists()
        )

    def test_changing_role_swaps_group(self):
        editor = Role.objects.get(slug="editor")
        viewer = Role.objects.get(slug="viewer")
        user = User.objects.create_user(
            email="x@example.com", password="pw-Str0ng!42", role=editor
        )
        user.role = viewer
        user.save()
        user.refresh_from_db()
        self.assertTrue(
            user.groups.filter(name=group_name_for_role("viewer")).exists()
        )
        self.assertFalse(
            user.groups.filter(name=group_name_for_role("editor")).exists()
        )

    def test_clearing_role_removes_managed_group(self):
        viewer = Role.objects.get(slug="viewer")
        user = User.objects.create_user(
            email="y@example.com", password="pw-Str0ng!42", role=viewer
        )
        user.role = None
        user.save()
        user.refresh_from_db()
        self.assertFalse(user.groups.filter(name__in=ROLE_GROUP_NAMES).exists())


class AdminPermissionEnforcementTests(TestCase):
    """Role-based permissions are enforced through the admin's has_* methods."""

    def setUp(self):
        sync_role_groups()
        self.factory = RequestFactory()
        self.stations_admin = StationsAdmin(Stations, admin.site)
        self.regions_admin = RegionsAdmin(Regions, admin.site)

    def _user_with_role(self, slug, email):
        role = Role.objects.get(slug=slug)
        user = User.objects.create_user(
            email=email, password="pw-Str0ng!42", role=role
        )
        user.refresh_from_db()
        return User.objects.get(pk=user.pk)  # reload perms cache

    def _request(self, user):
        request = self.factory.get("/admin/api/stations/")
        request.user = user
        return request

    def test_viewer_is_read_only(self):
        user = self._user_with_role("viewer", "viewer@example.com")
        request = self._request(user)
        self.assertTrue(self.stations_admin.has_view_permission(request))
        self.assertFalse(self.stations_admin.has_add_permission(request))
        self.assertFalse(self.stations_admin.has_change_permission(request))
        self.assertFalse(self.stations_admin.has_delete_permission(request))

    def test_editor_can_change_not_delete(self):
        user = self._user_with_role("editor", "editor2@example.com")
        request = self._request(user)
        self.assertTrue(self.stations_admin.has_change_permission(request))
        self.assertFalse(self.stations_admin.has_delete_permission(request))
        self.assertFalse(self.stations_admin.has_add_permission(request))

    def test_admin_manages_stations(self):
        user = self._user_with_role("admin", "admin2@example.com")
        request = self._request(user)
        self.assertTrue(self.stations_admin.has_add_permission(request))
        self.assertTrue(self.stations_admin.has_change_permission(request))
        self.assertTrue(self.stations_admin.has_delete_permission(request))

    def test_superadmin_has_full_access(self):
        user = self._user_with_role("superadmin", "super2@example.com")
        request = self._request(user)
        self.assertTrue(self.stations_admin.has_add_permission(request))
        self.assertTrue(self.stations_admin.has_delete_permission(request))
        self.assertTrue(self.regions_admin.has_delete_permission(request))

    def test_user_without_role_has_no_access(self):
        user = User.objects.create_user(
            email="norole@example.com", password="pw-Str0ng!42"
        )
        request = self._request(user)
        self.assertFalse(self.stations_admin.has_view_permission(request))
        self.assertFalse(self.stations_admin.has_module_permission(request))
