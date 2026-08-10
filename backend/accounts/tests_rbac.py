from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.test import RequestFactory, TestCase

from accounts.models import Role
from accounts.permissions import (
    ROLE_GROUP_NAMES,
    group_name_for_role,
    sync_role_groups,
)
from api.admin import RegionsViewer, StationsViewer
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

    def test_editor_group_is_view_only_on_operational_models(self):
        group = Group.objects.get(name=group_name_for_role("editor"))
        codenames = set(group.permissions.values_list("codename", flat=True))
        # View-only for now; edits will land on future override/details models.
        self.assertIn("view_stations", codenames)
        self.assertNotIn("change_stations", codenames)
        self.assertNotIn("add_stations", codenames)
        self.assertNotIn("delete_stations", codenames)
        # No access to administrative configuration (users/roles).
        self.assertFalse({c for c in codenames if c.endswith("_user")})
        self.assertFalse({c for c in codenames if c.endswith("_role")})

    def test_admin_group_views_stations_and_reads_config(self):
        group = Group.objects.get(name=group_name_for_role("admin"))
        codenames = set(group.permissions.values_list("codename", flat=True))
        # Reflected dbt tables are view-only for Admin too (edits will happen on
        # future override/details models).
        self.assertIn("view_stations", codenames)
        self.assertNotIn("add_stations", codenames)
        self.assertNotIn("change_stations", codenames)
        self.assertNotIn("delete_stations", codenames)
        # Admin can still read administrative configuration.
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
        self.assertTrue(user.groups.filter(name=group_name_for_role("editor")).exists())

    def test_changing_role_swaps_group(self):
        editor = Role.objects.get(slug="editor")
        viewer = Role.objects.get(slug="viewer")
        user = User.objects.create_user(
            email="x@example.com", password="pw-Str0ng!42", role=editor
        )
        user.role = viewer
        user.save()
        user.refresh_from_db()
        self.assertTrue(user.groups.filter(name=group_name_for_role("viewer")).exists())
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


class ReadOnlyAdminEnforcementTests(TestCase):
    """The dbt-managed tables stay immutable in the admin, by two mechanisms.

    Regions has no editable child, so its admin denies add/change/delete for
    every role. Stations must allow the change *page* to open, because
    StationDetails is edited inline there — its own fields are protected by
    ``readonly_fields`` instead, and add/delete stay denied for everyone.

    The role matrix still governs visibility and is enforced at Django's
    permission layer."""

    def setUp(self):
        sync_role_groups()
        self.factory = RequestFactory()
        self.stations_admin = StationsViewer(Stations, admin.site)
        self.regions_admin = RegionsViewer(Regions, admin.site)

    def _user_with_role(self, slug, email):
        role = Role.objects.get(slug=slug)
        user = User.objects.create_user(email=email, password="pw-Str0ng!42", role=role)
        user.refresh_from_db()
        return User.objects.get(pk=user.pk)  # reload perms cache

    def _request(self, user):
        request = self.factory.get("/admin/api/stations/")
        request.user = user
        return request

    def test_regions_read_only_for_all_roles(self):
        # No role — not even superadmin — can add/change/delete regions.
        for slug in ("viewer", "editor", "admin", "superadmin"):
            user = self._user_with_role(slug, f"{slug}@example.com")
            request = self._request(user)
            self.assertFalse(self.regions_admin.has_add_permission(request), slug)
            self.assertFalse(self.regions_admin.has_change_permission(request), slug)
            self.assertFalse(self.regions_admin.has_delete_permission(request), slug)

    def test_stations_cannot_be_added_or_deleted_by_any_role(self):
        for slug in ("viewer", "editor", "admin", "superadmin"):
            user = self._user_with_role(slug, f"{slug}@example.com")
            request = self._request(user)
            self.assertFalse(self.stations_admin.has_add_permission(request), slug)
            self.assertFalse(self.stations_admin.has_delete_permission(request), slug)

    def test_station_change_page_follows_the_details_permission(self):
        # The station page opens only to edit its inline details, so change
        # access tracks `change_stationdetails` and not `change_stations`.
        for slug in ("editor", "admin", "superadmin"):
            user = self._user_with_role(slug, f"{slug}@example.com")
            self.assertTrue(
                self.stations_admin.has_change_permission(self._request(user)), slug
            )

        viewer = self._user_with_role("viewer", "viewer-change@example.com")
        self.assertFalse(
            self.stations_admin.has_change_permission(self._request(viewer))
        )

    def test_station_own_fields_are_never_editable(self):
        # Whatever the role, none of the dbt-written columns can be edited: the
        # admin exposes them all as read-only.
        self.assertEqual(
            set(self.stations_admin.readonly_fields),
            {
                "name",
                "region",
                "latitude",
                "longitude",
                "is_station_on",
                "is_pattern_station",
            },
        )

    def test_view_permission_follows_role_matrix(self):
        viewer = self._user_with_role("viewer", "viewer@example.com")
        self.assertTrue(self.stations_admin.has_view_permission(self._request(viewer)))

        norole = User.objects.create_user(
            email="norole@example.com", password="pw-Str0ng!42"
        )
        self.assertFalse(self.stations_admin.has_view_permission(self._request(norole)))
        self.assertFalse(
            self.stations_admin.has_module_permission(self._request(norole))
        )

    def test_permission_matrix_enforced_at_permission_layer(self):
        # The role->group matrix grants model permissions independently of the
        # admin classes above: nobody gets write access on the reflected dbt
        # tables, whatever their role.
        editor = self._user_with_role("editor", "editor@example.com")
        self.assertTrue(editor.has_perm("api.view_stations"))
        self.assertFalse(editor.has_perm("api.change_stations"))

        viewer = self._user_with_role("viewer", "viewer2@example.com")
        self.assertTrue(viewer.has_perm("api.view_stations"))
        self.assertFalse(viewer.has_perm("api.change_stations"))

        # Admin is view-only on the reflected dbt tables.
        admin_user = self._user_with_role("admin", "admin@example.com")
        self.assertTrue(admin_user.has_perm("api.view_stations"))
        self.assertFalse(admin_user.has_perm("api.delete_stations"))

    def test_admin_owned_station_models_are_editable_per_role(self):
        # Station Details / Station Override are backend-owned, so unlike the
        # reflected tables they carry real write permissions.
        for slug in ("editor", "admin"):
            user = self._user_with_role(slug, f"{slug}-owned@example.com")
            self.assertTrue(user.has_perm("api.change_stationdetails"), slug)
            self.assertTrue(user.has_perm("api.add_stationoverride"), slug)
            self.assertTrue(user.has_perm("api.change_stationoverride"), slug)

        # Retiring an override is an Admin decision.
        editor = self._user_with_role("editor", "editor-delete@example.com")
        self.assertFalse(editor.has_perm("api.delete_stationoverride"))
        admin_user = self._user_with_role("admin", "admin-delete@example.com")
        self.assertTrue(admin_user.has_perm("api.delete_stationoverride"))

        viewer = self._user_with_role("viewer", "viewer-owned@example.com")
        self.assertTrue(viewer.has_perm("api.view_stationdetails"))
        self.assertFalse(viewer.has_perm("api.change_stationdetails"))
        self.assertFalse(viewer.has_perm("api.change_stationoverride"))
