"""Tests for the admin/member role inside an institution (#314).

Locks in three things: every link defaults to ``admin`` (so nobody lost write
access when the role was introduced), the role reaches the panel through
``/api/institution/me/`` (and the login response), and ``IsInstitutionAdmin``
keeps a member out of the panel's only write — recording an action — while
still letting them read everything.
"""

from datetime import date

from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
from django.test import RequestFactory, TestCase
from django.urls import reverse
from rest_framework.test import APIClient, APITestCase

from .models import (
    ActionLog,
    Institution,
    InstitutionContract,
    InstitutionRole,
    InstitutionUser,
    Regions,
    Stations,
    UserProfile,
    UserRole,
    get_institution_role,
)
from .permissions import IsInstitutionAdmin
from .serializers import InstitutionSerializer

User = get_user_model()
PASSWORD = "S3ed!Pass99"


class InstitutionRoleTestCase(APITestCase):
    def setUp(self):
        self.client = APIClient()
        region = Regions.seed_for_tests(name="Gran Asuncion", region_code="GA")
        self.institution = Institution.objects.create(legal_name="Industria Ejemplo")
        self.station = Stations.seed_for_tests(
            name="Respira: Planta Norte", region=region, is_station_on=True
        )
        InstitutionContract.objects.create(
            institution=self.institution,
            station=self.station,
            contract_status=InstitutionContract.ContractStatus.ACTIVE,
            start_date=date(2026, 1, 1),
        )

        self.admin_user = self._user("admin@industria.example")
        # Created without a role, the way every pre-existing link was.
        InstitutionUser.objects.create(
            user=self.admin_user, institution=self.institution
        )

        self.member_user = self._user("member@industria.example")
        InstitutionUser.objects.create(
            user=self.member_user,
            institution=self.institution,
            role=InstitutionRole.MEMBER,
        )

        self.me_url = reverse("institution-me")
        self.action_logs_url = reverse("action-logs-list")

    def _user(self, email):
        return User.objects.create_user(username=email, email=email, password=PASSWORD)


class InstitutionRoleModelTests(InstitutionRoleTestCase):
    def test_a_link_defaults_to_admin(self):
        link = InstitutionUser.objects.get(user=self.admin_user)
        self.assertEqual(link.role, InstitutionRole.ADMIN)
        self.assertEqual(link.role, "admin")

    def test_role_values_are_admin_and_member(self):
        self.assertEqual(set(InstitutionRole.values), {"admin", "member"})

    def test_get_institution_role_reads_the_users_link(self):
        self.assertEqual(get_institution_role(self.admin_user), "admin")
        self.assertEqual(get_institution_role(self.member_user), "member")

    def test_get_institution_role_is_none_without_a_link(self):
        self.assertIsNone(get_institution_role(self._user("nobody@example.com")))
        self.assertIsNone(get_institution_role(None))

    def test_a_platform_admin_role_does_not_make_an_institution_admin(self):
        # The two roles are independent: a platform admin who is a *member* of
        # an institution is still a member there.
        UserProfile.objects.create(user=self.member_user, role=UserRole.ADMIN)
        self.member_user.refresh_from_db()
        self.assertEqual(get_institution_role(self.member_user), "member")


class InstitutionRoleInMeTests(InstitutionRoleTestCase):
    def test_me_returns_admin_for_an_admin(self):
        self.client.force_authenticate(self.admin_user)
        response = self.client.get(self.me_url)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["role"], "admin")

    def test_me_returns_member_for_a_member(self):
        self.client.force_authenticate(self.member_user)
        response = self.client.get(self.me_url)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["role"], "member")

    def test_me_keeps_institution_type_flat(self):
        self.institution.institution_type = "industria"
        self.institution.save()

        self.client.force_authenticate(self.member_user)
        body = self.client.get(self.me_url).json()

        self.assertEqual(body["institution_type"], "industria")

    def test_login_response_carries_the_role_of_who_logged_in(self):
        response = self.client.post(
            reverse("institution-login"),
            {"email": "member@industria.example", "password": PASSWORD},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["role"], "member")


class InstitutionCallerInMeTests(InstitutionRoleTestCase):
    """``user`` on /me: who is logged in, for the panel's user card."""

    def test_me_returns_the_callers_email_and_full_name(self):
        self.member_user.first_name = "Ana"
        self.member_user.last_name = "Benítez"
        self.member_user.save()

        self.client.force_authenticate(self.member_user)
        body = self.client.get(self.me_url).json()

        self.assertEqual(
            body["user"],
            {"email": "member@industria.example", "full_name": "Ana Benítez"},
        )

    def test_full_name_is_an_empty_string_when_unset(self):
        self.client.force_authenticate(self.admin_user)
        body = self.client.get(self.me_url).json()

        self.assertEqual(
            body["user"], {"email": "admin@industria.example", "full_name": ""}
        )

    def test_a_first_name_alone_has_no_trailing_space(self):
        self.admin_user.first_name = "Ana"
        self.admin_user.save()

        self.client.force_authenticate(self.admin_user)
        body = self.client.get(self.me_url).json()

        self.assertEqual(body["user"]["full_name"], "Ana")

    def test_user_is_the_caller_not_another_member(self):
        self.client.force_authenticate(self.member_user)
        body = self.client.get(self.me_url).json()

        self.assertEqual(body["user"]["email"], "member@industria.example")

    def test_login_response_carries_who_logged_in(self):
        response = self.client.post(
            reverse("institution-login"),
            {"email": "member@industria.example", "password": PASSWORD},
            format="json",
        )

        self.assertEqual(response.json()["user"]["email"], "member@industria.example")

    def test_user_is_null_without_a_request(self):
        data = InstitutionSerializer(self.institution).data

        self.assertIsNone(data["user"])

    def test_user_is_null_for_an_anonymous_request(self):
        request = RequestFactory().get(self.me_url)
        request.user = AnonymousUser()

        data = InstitutionSerializer(
            self.institution, context={"request": request}
        ).data

        self.assertIsNone(data["user"])


class InstitutionAdminPermissionTests(InstitutionRoleTestCase):
    def test_admin_can_record_an_action(self):
        self.client.force_authenticate(self.admin_user)
        response = self.client.post(
            self.action_logs_url,
            {"station": self.station.id, "note": "Se humedecieron las zonas de carga."},
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(ActionLog.objects.count(), 1)

    def test_member_cannot_record_an_action(self):
        self.client.force_authenticate(self.member_user)
        response = self.client.post(
            self.action_logs_url,
            {"station": self.station.id, "note": "Intento de un miembro."},
            format="json",
        )

        self.assertEqual(response.status_code, 403)
        self.assertEqual(ActionLog.objects.count(), 0)

    def test_member_can_still_list_actions(self):
        ActionLog.objects.create(
            institution=self.institution, station=self.station, note="Registrada."
        )

        self.client.force_authenticate(self.member_user)
        response = self.client.get(self.action_logs_url)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()["results"]), 1)

    def test_member_can_read_the_dashboard(self):
        self.client.force_authenticate(self.member_user)
        response = self.client.get(reverse("institution-dashboard"))

        self.assertEqual(response.status_code, 200)

    def test_demoting_an_admin_takes_effect_immediately(self):
        link = InstitutionUser.objects.get(user=self.admin_user)
        link.role = InstitutionRole.MEMBER
        link.save()
        self.admin_user.refresh_from_db()

        self.client.force_authenticate(self.admin_user)
        response = self.client.post(
            self.action_logs_url,
            {"station": self.station.id, "note": "Ya no puede."},
            format="json",
        )

        self.assertEqual(response.status_code, 403)

    def test_unauthenticated_create_is_still_rejected(self):
        response = self.client.post(
            self.action_logs_url,
            {"station": self.station.id, "note": "Anónimo."},
            format="json",
        )
        self.assertIn(response.status_code, (401, 403))


class IsInstitutionAdminUnitTests(InstitutionRoleTestCase):
    def _request(self, method, user):
        request = getattr(RequestFactory(), method)("/")
        request.user = user
        return request

    def test_safe_methods_pass_for_a_member(self):
        permission = IsInstitutionAdmin()
        for method in ("get", "head", "options"):
            self.assertTrue(
                permission.has_permission(self._request(method, self.member_user), None)
            )

    def test_unsafe_methods_need_an_admin(self):
        permission = IsInstitutionAdmin()
        for method in ("post", "put", "patch", "delete"):
            self.assertFalse(
                permission.has_permission(self._request(method, self.member_user), None)
            )
            self.assertTrue(
                permission.has_permission(self._request(method, self.admin_user), None)
            )

    def test_unsafe_methods_are_refused_without_an_institution(self):
        permission = IsInstitutionAdmin()
        outsider = self._user("outsider@example.com")
        self.assertFalse(
            permission.has_permission(self._request("post", outsider), None)
        )


class InstitutionRoleAdminTests(TestCase):
    def setUp(self):
        self.superuser = User.objects.create_superuser(
            email="backoffice@example.com", password="pw-Str0ng!42"
        )
        self.client.force_login(self.superuser)
        self.institution = Institution.objects.create(legal_name="Colegio Ejemplo")
        user = User.objects.create_user(
            username="docente@colegio.example",
            email="docente@colegio.example",
            password=PASSWORD,
        )
        self.link = InstitutionUser.objects.create(
            user=user, institution=self.institution, role=InstitutionRole.MEMBER
        )

    def test_the_institution_page_shows_an_editable_role(self):
        response = self.client.get(
            reverse("admin:api_institution_change", args=[self.institution.pk])
        )

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'name="users-0-role"')
        self.assertContains(response, '<option value="member" selected>')
