"""Tests for the institutional dashboard endpoint (/api/institution/).

Covers the authorization boundary the ticket cares about: an authenticated
user may only ever see the Institution their InstitutionUser link points to,
never another institution's data, and an anonymous request never gets in.
"""

from datetime import date
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework.test import APITestCase

from .models import Institution, InstitutionContract, InstitutionUser, Regions, Stations

User = get_user_model()


class InstitutionDashboardTests(APITestCase):
    def setUp(self):
        self.client = APIClient()

        self.institution = Institution.objects.create(legal_name="Hospital Bautista")
        self.other_institution = Institution.objects.create(
            legal_name="Colegio San Jose S.A."
        )

        region = Regions.objects.create(name="Gran Asuncion", region_code="GA")
        station = Stations.objects.create(
            name="Respira: Villa Morra",
            region=region,
            latitude=-25.29,
            longitude=-57.57,
        )
        InstitutionContract.objects.create(
            institution=self.institution,
            station=station,
            contract_status=InstitutionContract.ContractStatus.ACTIVE,
            start_date=date(2026, 1, 1),
            monthly_fee=Decimal("450.00"),
        )

        self.user = User.objects.create_user(
            username="contact@hospitalbautista.org.py",
            email="contact@hospitalbautista.org.py",
            password="S3ed!Pass99",
        )
        InstitutionUser.objects.create(user=self.user, institution=self.institution)

        self.other_user = User.objects.create_user(
            username="contact@colegiosanjose.edu.py",
            email="contact@colegiosanjose.edu.py",
            password="S3ed!Pass99",
        )
        InstitutionUser.objects.create(
            user=self.other_user, institution=self.other_institution
        )

        self.unlinked_user = User.objects.create_user(
            username="nobody@example.com",
            email="nobody@example.com",
            password="S3ed!Pass99",
        )

        self.me_url = reverse("institution-me")
        self.list_url = reverse("institution-list")

    def _detail_url(self, institution_id):
        return reverse("institution-detail", args=[institution_id])

    # --- Unauthenticated -------------------------------------------------

    def test_unauthenticated_me_is_rejected(self):
        response = self.client.get(self.me_url)
        self.assertIn(response.status_code, (401, 403))

    def test_unauthenticated_list_is_rejected(self):
        response = self.client.get(self.list_url)
        self.assertIn(response.status_code, (401, 403))

    def test_unauthenticated_detail_is_rejected(self):
        response = self.client.get(self._detail_url(self.institution.id))
        self.assertIn(response.status_code, (401, 403))

    # --- Authenticated without an institution link ------------------------

    def test_authenticated_user_without_institution_is_forbidden(self):
        self.client.force_authenticate(self.unlinked_user)
        response = self.client.get(self.me_url)
        self.assertEqual(response.status_code, 403)

    # --- Authenticated, own institution ------------------------------------

    def test_me_returns_own_institution_with_contract(self):
        self.client.force_authenticate(self.user)
        response = self.client.get(self.me_url)

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["id"], self.institution.id)
        self.assertEqual(body["legal_name"], "Hospital Bautista")
        self.assertEqual(body["contract"]["contract_status"], "active")
        self.assertEqual(body["contract"]["station_name"], "Respira: Villa Morra")

    def test_retrieve_own_institution_by_id_succeeds(self):
        self.client.force_authenticate(self.user)
        response = self.client.get(self._detail_url(self.institution.id))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["id"], self.institution.id)

    def test_list_returns_only_own_institution(self):
        self.client.force_authenticate(self.user)
        response = self.client.get(self.list_url)

        self.assertEqual(response.status_code, 200)
        results = response.json()
        ids = [item["id"] for item in results]
        self.assertEqual(ids, [self.institution.id])

    def test_institution_without_a_contract_returns_null_contract(self):
        contractless = Institution.objects.create(legal_name="Colegio Nuevo")
        contact = User.objects.create_user(
            username="contacto@colegionuevo.edu.py",
            email="contacto@colegionuevo.edu.py",
            password="S3ed!Pass99",
        )
        InstitutionUser.objects.create(user=contact, institution=contractless)

        self.client.force_authenticate(contact)
        response = self.client.get(self.me_url)

        self.assertEqual(response.status_code, 200)
        self.assertIsNone(response.json()["contract"])

    # --- Authenticated, another institution's resource ---------------------

    def test_retrieve_another_institutions_detail_is_forbidden(self):
        self.client.force_authenticate(self.user)
        response = self.client.get(self._detail_url(self.other_institution.id))

        self.assertEqual(response.status_code, 403)

    def test_list_never_leaks_another_institution(self):
        self.client.force_authenticate(self.user)
        response = self.client.get(self.list_url)

        ids = [item["id"] for item in response.json()]
        self.assertNotIn(self.other_institution.id, ids)


class InstitutionLoginTests(APITestCase):
    """Tests for /api/institution/login/ and /logout/.

    Unlike the rest of this file, these use a real ``APIClient`` session
    (never ``force_authenticate``) so a passing test proves the login view
    actually establishes a Django session an institutional user can browse
    the dashboard with — the same mechanism the admin login form uses.
    """

    def setUp(self):
        self.client = APIClient()

        self.institution = Institution.objects.create(legal_name="Hospital Bautista")
        self.user = User.objects.create_user(
            username="dashboard@hospitalbautista.org.py",
            email="dashboard@hospitalbautista.org.py",
            password="S3ed!Pass99",
        )
        InstitutionUser.objects.create(user=self.user, institution=self.institution)

        # A platform user who is not tied to any institution (e.g. an admin
        # account created for the backoffice, or simply a stray account).
        self.staff_user = User.objects.create_user(
            username="admin@example.com",
            email="admin@example.com",
            password="Adm1n!Pass99",
        )

        self.login_url = reverse("institution-login")
        self.logout_url = reverse("institution-logout")
        self.me_url = reverse("institution-me")

    def test_valid_credentials_log_in_and_return_the_institution(self):
        response = self.client.post(
            self.login_url,
            {"email": "dashboard@hospitalbautista.org.py", "password": "S3ed!Pass99"},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["id"], self.institution.id)

    def test_login_establishes_a_usable_session(self):
        self.client.post(
            self.login_url,
            {"email": "dashboard@hospitalbautista.org.py", "password": "S3ed!Pass99"},
            format="json",
        )

        # No force_authenticate here: this relies entirely on the session
        # cookie the login request above set on self.client.
        response = self.client.get(self.me_url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["id"], self.institution.id)

    def test_wrong_password_is_rejected(self):
        response = self.client.post(
            self.login_url,
            {"email": "dashboard@hospitalbautista.org.py", "password": "wrong"},
            format="json",
        )

        self.assertEqual(response.status_code, 400)

    def test_unknown_email_is_rejected(self):
        response = self.client.post(
            self.login_url,
            {"email": "nobody@example.com", "password": "whatever123"},
            format="json",
        )

        self.assertEqual(response.status_code, 400)

    def test_account_without_an_institution_cannot_log_in_here(self):
        response = self.client.post(
            self.login_url,
            {"email": "admin@example.com", "password": "Adm1n!Pass99"},
            format="json",
        )

        self.assertEqual(response.status_code, 403)

    def test_account_without_an_institution_gets_no_session(self):
        self.client.post(
            self.login_url,
            {"email": "admin@example.com", "password": "Adm1n!Pass99"},
            format="json",
        )

        # The 403 above must not have logged the account in regardless.
        response = self.client.get(self.me_url)
        self.assertEqual(response.status_code, 403)

    def test_logout_clears_the_session(self):
        self.client.post(
            self.login_url,
            {"email": "dashboard@hospitalbautista.org.py", "password": "S3ed!Pass99"},
            format="json",
        )

        logout_response = self.client.post(self.logout_url)
        self.assertEqual(logout_response.status_code, 204)

        me_response = self.client.get(self.me_url)
        self.assertEqual(me_response.status_code, 403)

    def test_logout_without_a_session_is_rejected(self):
        response = self.client.post(self.logout_url)
        self.assertIn(response.status_code, (401, 403))

    def test_logout_requires_a_csrf_token_but_login_does_not(self):
        """Locks in the CSRF contract the frontend must implement.

        The default ``APIClient`` skips CSRF enforcement, which is why every
        other test above uses it — but that also means it can't catch a
        frontend integration bug here, so this one opts back into real
        enforcement. Login is a POST with no session yet, so Django never
        requires a CSRF token for it; logout runs *inside* the session login
        just created, so it does, via the ``csrftoken`` cookie login sets
        (see ``get_token(request)`` in the view) sent back as the
        ``X-CSRFToken`` header.
        """
        csrf_client = APIClient(enforce_csrf_checks=True)

        login_response = csrf_client.post(
            self.login_url,
            {"email": "dashboard@hospitalbautista.org.py", "password": "S3ed!Pass99"},
            format="json",
        )
        self.assertEqual(login_response.status_code, 200)

        without_token = csrf_client.post(self.logout_url)
        self.assertEqual(without_token.status_code, 403)

        csrf_token = csrf_client.cookies["csrftoken"].value
        with_token = csrf_client.post(self.logout_url, HTTP_X_CSRFTOKEN=csrf_token)
        self.assertEqual(with_token.status_code, 204)
