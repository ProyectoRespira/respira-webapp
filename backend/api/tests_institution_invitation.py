"""Tests for first access to the institutional dashboard (#311, #312, #313).

An invited user exists, is linked to an institution, and has no usable
password. The flow under test:

  1. they receive the invitation email (``api.invitations``), sent from the
     Admin (on creating the user, or with the action on Institution) or asked
     for again through ``POST /api/auth/activate/`` — or through "¿Olvidaste
     tu contraseña?", which has no password to reset for them;
  2. its link opens the reset page in "create" mode and is consumed by the
     existing ``password-reset/confirm`` endpoint;
  3. until then, login refuses the account.

The properties worth pinning down: the link is Django's own token and works
for a password that was never set, ``activate`` answers 204 whatever the
address, sends nothing to anyone who is not a pending invitee, and is rate
limited per IP.
"""

import html
import re
from unittest import mock
from urllib.parse import parse_qs, urlsplit

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Permission
from django.contrib.auth.tokens import default_token_generator
from django.core import mail
from django.core.cache import cache
from django.test import RequestFactory, TestCase
from django.urls import reverse
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from rest_framework import status
from rest_framework.test import APIClient, APITestCase
from rest_framework.throttling import ScopedRateThrottle

from .invitations import send_institution_invitation
from .models import Institution, InstitutionUser

User = get_user_model()

PASSWORD = "S3ed!Pass99"
NEW_PASSWORD = "N3w!Passw0rd42"

LINK_RE = re.compile(r"https?://\S+/institucion/restablecer-clave\?\S+")


def invitation_link(body: str) -> str:
    match = LINK_RE.search(body)
    assert match is not None, f"No invitation link in email body:\n{body}"
    return match.group(0)


def link_query(body: str) -> dict[str, str]:
    query = parse_qs(urlsplit(invitation_link(body)).query)
    return {key: values[0] for key, values in query.items()}


def make_invitee(email: str, institution: Institution):
    """A dashboard user the way an invitation leaves them: no password."""
    user = User.objects.create_user(username=email, email=email, password=None)
    InstitutionUser.objects.create(user=user, institution=institution)
    return user


class InvitationEmailTests(TestCase):
    """``send_institution_invitation`` — the reusable service."""

    def setUp(self):
        self.institution = Institution.objects.create(
            legal_name="Industria Ejemplo S.A.", display_name="Industria & Co."
        )
        self.user = make_invitee("ana@industria.example", self.institution)
        self.request = RequestFactory().get(
            "/", HTTP_HOST="demo.proyectorespira.net", secure=True
        )

    def send(self):
        send_institution_invitation(self.user, request=self.request)
        self.assertEqual(len(mail.outbox), 1)
        return mail.outbox[0]

    def test_invitee_has_no_usable_password(self):
        """The precondition everything else relies on."""
        self.assertFalse(self.user.has_usable_password())

    def test_link_is_a_valid_create_mode_token_for_the_user(self):
        message = self.send()

        self.assertEqual(message.to, [self.user.email])
        query = link_query(message.body)
        self.assertEqual(query["modo"], "crear")
        self.assertEqual(query["uid"], urlsafe_base64_encode(force_bytes(self.user.pk)))
        self.assertTrue(default_token_generator.check_token(self.user, query["token"]))

    def test_link_points_at_the_reset_page_on_the_requesting_host(self):
        message = self.send()

        self.assertTrue(
            invitation_link(message.body).startswith(
                "https://demo.proyectorespira.net/institucion/restablecer-clave?"
            )
        )

    def test_link_keeps_the_reset_links_tail(self):
        """`modo` goes first, so the link still ends in `uid=…&token=…`."""
        link = invitation_link(self.send().body)

        self.assertRegex(link, r"\?modo=crear&uid=[^&]+&token=[^&]+$")

    def test_email_names_the_institution_and_the_expiry(self):
        message = self.send()

        self.assertIn("Industria & Co.", message.subject)
        self.assertNotIn("\n", message.subject)
        self.assertIn("Industria & Co.", message.body)
        self.assertIn("24 horas", message.body)

    def test_html_part_carries_the_same_link_and_escapes_the_name(self):
        message = self.send()

        self.assertEqual(len(message.alternatives), 1)
        html_part, mime_type = message.alternatives[0]
        self.assertEqual(mime_type, "text/html")

        self.assertIn(f'href="{html.escape(invitation_link(message.body))}"', html_part)
        self.assertIn("Crear contraseña", html_part)
        self.assertIn("Industria &amp; Co.", html_part)
        self.assertIn('src="https://demo.proyectorespira.net/favicon.png"', html_part)
        for leftover in ("{#", "#}", "{%", "%}", "{{", "}}"):
            self.assertNotIn(leftover, html_part)

    def test_user_without_institution_cannot_be_invited(self):
        stranger = User.objects.create_user(email="x@example.org", password=None)

        with self.assertRaises(ValueError):
            send_institution_invitation(stranger, request=self.request)
        self.assertEqual(len(mail.outbox), 0)


class ActivateTests(APITestCase):
    """``POST /api/auth/activate/`` — "¿Sos nuevo en la plataforma?"."""

    def setUp(self):
        super().setUp()
        # The throttle counts in the cache; one test's requests must not spend
        # the next one's budget.
        cache.clear()
        self.client = APIClient()
        self.url = reverse("auth-activate")
        self.institution = Institution.objects.create(legal_name="Colegio Ejemplo")
        self.invitee = make_invitee("pending@colegio.example", self.institution)

    def activate(self, email):
        return self.client.post(self.url, {"email": email}, format="json")

    def test_route_is_the_documented_one(self):
        self.assertEqual(self.url, "/api/auth/activate/")

    def test_pending_invitee_receives_the_invitation(self):
        response = self.activate(self.invitee.email)

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, [self.invitee.email])
        query = link_query(mail.outbox[0].body)
        self.assertEqual(query["modo"], "crear")
        self.assertTrue(
            default_token_generator.check_token(self.invitee, query["token"])
        )

    def test_address_is_matched_case_insensitively(self):
        self.activate("Pending@Colegio.Example")

        self.assertEqual(len(mail.outbox), 1)

    def test_unknown_address_gets_the_same_answer_and_no_mail(self):
        known = self.activate(self.invitee.email)
        mail.outbox.clear()

        unknown = self.activate("nobody@example.org")

        self.assertEqual(unknown.status_code, known.status_code)
        self.assertEqual(unknown.content, known.content)
        self.assertEqual(len(mail.outbox), 0)
        self.assertFalse(User.objects.filter(email="nobody@example.org").exists())

    def test_user_who_already_has_a_password_gets_nothing(self):
        """That is a reset, with its own endpoint — not an invitation."""
        self.invitee.set_password(PASSWORD)
        self.invitee.save()

        response = self.activate(self.invitee.email)

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(len(mail.outbox), 0)

    def test_user_without_institution_gets_nothing(self):
        User.objects.create_user(email="loose@example.org", password=None)

        response = self.activate("loose@example.org")

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(len(mail.outbox), 0)

    def test_inactive_invitee_gets_nothing(self):
        self.invitee.is_active = False
        self.invitee.save(update_fields=["is_active"])

        response = self.activate(self.invitee.email)

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(len(mail.outbox), 0)

    def test_a_failed_send_still_answers_204(self):
        """A 500 only for real addresses would be an account oracle."""
        with mock.patch(
            "api.invitations.EmailMultiAlternatives.send",
            side_effect=OSError("SMTP down"),
        ):
            with self.assertLogs("api.invitations", level="ERROR"):
                response = self.activate(self.invitee.email)

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

    def test_malformed_address_is_rejected(self):
        response = self.activate("not-an-email")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(len(mail.outbox), 0)

    def test_requests_are_rate_limited_per_ip(self):
        with mock.patch.dict(
            ScopedRateThrottle.THROTTLE_RATES, {"account_activation": "2/hour"}
        ):
            for _ in range(2):
                self.activate(self.invitee.email)
            throttled = self.activate("nobody@example.org")

        self.assertEqual(throttled.status_code, status.HTTP_429_TOO_MANY_REQUESTS)
        self.assertEqual(len(mail.outbox), 2)

    def test_bucket_is_separate_from_password_reset(self):
        with mock.patch.dict(
            ScopedRateThrottle.THROTTLE_RATES, {"password_reset": "1/hour"}
        ):
            for _ in range(2):
                self.client.post(
                    reverse("institution-password-reset"),
                    {"email": "nobody@example.org"},
                    format="json",
                )
            response = self.activate(self.invitee.email)

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)


class FirstPasswordTests(APITestCase):
    """#312: the confirm endpoint sets a first password; login waits for it."""

    def setUp(self):
        super().setUp()
        cache.clear()
        self.client = APIClient()
        self.institution = Institution.objects.create(legal_name="Colegio Ejemplo")
        self.invitee = make_invitee("pending@colegio.example", self.institution)
        self.login_url = reverse("institution-login")
        self.confirm_url = reverse("institution-password-reset-confirm")

        self.client.post(
            reverse("auth-activate"), {"email": self.invitee.email}, format="json"
        )
        query = link_query(mail.outbox[0].body)
        self.uid, self.token = query["uid"], query["token"]

    def login(self, password):
        return self.client.post(
            self.login_url,
            {"email": self.invitee.email, "password": password},
            format="json",
        )

    def confirm(self, **overrides):
        payload = {"uid": self.uid, "token": self.token, "new_password": NEW_PASSWORD}
        payload.update(overrides)
        return self.client.post(self.confirm_url, payload, format="json")

    def test_login_is_refused_before_a_password_exists(self):
        self.assertEqual(self.login("anything").status_code, 400)
        # The empty string is not a backdoor into an account without password.
        self.assertEqual(self.login("").status_code, 400)

    def test_invitation_link_sets_the_first_password(self):
        response = self.confirm()

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.invitee.refresh_from_db()
        self.assertTrue(self.invitee.has_usable_password())
        self.assertTrue(self.invitee.check_password(NEW_PASSWORD))
        self.assertEqual(self.login(NEW_PASSWORD).status_code, status.HTTP_200_OK)

    def test_invitation_link_works_once(self):
        self.assertEqual(self.confirm().status_code, status.HTTP_204_NO_CONTENT)

        replay = self.confirm(new_password="An0ther!Passw0rd")

        self.assertEqual(replay.status_code, status.HTTP_400_BAD_REQUEST)

    def test_password_rules_apply_to_the_first_password_too(self):
        response = self.confirm(new_password="short")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("new_password", response.json())
        self.invitee.refresh_from_db()
        self.assertFalse(self.invitee.has_usable_password())

    def test_after_activation_activate_sends_nothing_more(self):
        self.confirm()
        mail.outbox.clear()

        self.client.post(
            reverse("auth-activate"), {"email": self.invitee.email}, format="json"
        )

        self.assertEqual(len(mail.outbox), 0)


class InvitationAdminActionTests(TestCase):
    """The operator's trigger: an action on the Institution changelist."""

    def setUp(self):
        self.superuser = User.objects.create_superuser(
            email="admin@example.com", password="pw-Str0ng!42"
        )
        self.client.force_login(self.superuser)
        self.institution = Institution.objects.create(legal_name="Industria Ejemplo")
        self.pending = make_invitee("pending@industria.example", self.institution)
        self.active = User.objects.create_user(
            email="active@industria.example", password=PASSWORD
        )
        InstitutionUser.objects.create(user=self.active, institution=self.institution)
        self.url = reverse("admin:api_institution_changelist")

    def run_action(self):
        return self.client.post(
            self.url,
            {
                "action": "send_dashboard_invitations",
                "_selected_action": [self.institution.pk],
            },
            follow=True,
        )

    def test_only_users_without_a_password_are_invited(self):
        response = self.run_action()

        self.assertEqual(response.status_code, 200)
        self.assertEqual([m.to for m in mail.outbox], [[self.pending.email]])
        query = link_query(mail.outbox[0].body)
        self.assertTrue(
            default_token_generator.check_token(self.pending, query["token"])
        )
        self.assertContains(response, "Invitation sent to 1 user(s).")
        self.assertContains(response, "1 user(s) skipped")


class InvitationOnUserCreationTests(TestCase):
    """Users → Add user: create a client's dashboard user in one step.

    The flow the owner described: the operator types the address, picks the
    institution, saves, and the person is emailed the invitation — nobody
    invents a password for them.
    """

    def setUp(self):
        self.superuser = User.objects.create_superuser(
            email="admin@example.com", password="pw-Str0ng!42"
        )
        self.client.force_login(self.superuser)
        self.institution = Institution.objects.create(legal_name="Industria Ejemplo")
        self.url = reverse("admin:accounts_user_add")

    def create(self, **overrides):
        data = {
            "email": "ana@industria.example",
            "first_name": "Ana",
            "last_name": "Benítez",
            "usable_password": "false",
            "password1": "",
            "password2": "",
            "dashboard_institution": str(self.institution.pk),
            "dashboard_role": "admin",
        }
        data.update(overrides)
        return self.client.post(self.url, data, follow=True)

    def test_add_page_offers_dashboard_access(self):
        response = self.client.get(self.url)

        self.assertContains(response, "Dashboard access")
        self.assertContains(response, 'name="dashboard_institution"')
        self.assertContains(response, 'name="usable_password"')

    def test_invitee_is_created_linked_and_invited_once(self):
        response = self.create()

        self.assertEqual(response.status_code, 200)
        user = User.objects.get(email="ana@industria.example")
        self.assertFalse(user.has_usable_password())
        self.assertFalse(user.is_staff)
        self.assertEqual((user.first_name, user.last_name), ("Ana", "Benítez"))
        self.assertEqual(user.institution_user.institution, self.institution)

        self.assertEqual([m.to for m in mail.outbox], [[user.email]])
        query = link_query(mail.outbox[0].body)
        self.assertEqual(query["modo"], "crear")
        self.assertTrue(default_token_generator.check_token(user, query["token"]))
        self.assertContains(response, f"Invitation sent to {user.email}")

    def test_role_inside_the_institution_is_stored(self):
        self.create(dashboard_role="member")

        user = User.objects.get(email="ana@industria.example")
        self.assertEqual(user.institution_user.role, "member")

    def test_failed_email_keeps_the_user_and_says_so(self):
        with mock.patch(
            "api.invitations.EmailMultiAlternatives.send",
            side_effect=OSError("SMTP down"),
        ):
            with self.assertLogs("accounts.admin", level="ERROR"):
                response = self.create()

        user = User.objects.get(email="ana@industria.example")
        self.assertEqual(user.institution_user.institution, self.institution)
        self.assertFalse(user.has_usable_password())
        self.assertContains(response, "could not be sent: SMTP down")
        self.assertNotContains(response, "Invitation sent to")

    def test_no_password_without_an_institution_is_refused(self):
        """Nobody could ever sign in to that account."""
        response = self.create(dashboard_institution="")

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "which needs an institution")
        self.assertFalse(User.objects.filter(email="ana@industria.example").exists())
        self.assertEqual(len(mail.outbox), 0)

    def test_staff_user_with_a_password_still_works(self):
        response = self.create(
            email="staff@example.com",
            usable_password="true",
            password1=NEW_PASSWORD,
            password2=NEW_PASSWORD,
            dashboard_institution="",
        )

        self.assertEqual(response.status_code, 200)
        user = User.objects.get(email="staff@example.com")
        self.assertTrue(user.check_password(NEW_PASSWORD))
        self.assertFalse(InstitutionUser.objects.filter(user=user).exists())
        self.assertEqual(len(mail.outbox), 0)

    def test_password_set_here_links_without_inviting(self):
        """A user who already has a password is not sent a link to replace it."""
        self.create(
            usable_password="true",
            password1=NEW_PASSWORD,
            password2=NEW_PASSWORD,
        )

        user = User.objects.get(email="ana@industria.example")
        self.assertTrue(user.check_password(NEW_PASSWORD))
        self.assertEqual(user.institution_user.institution, self.institution)
        self.assertEqual(len(mail.outbox), 0)

    def test_enabled_password_still_requires_one(self):
        response = self.create(usable_password="true")

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "This field is required.")
        self.assertFalse(User.objects.filter(email="ana@industria.example").exists())

    def test_operator_without_link_permission_cannot_grant_access(self):
        """Hidden is not enough: a hand-written POST is ignored too."""
        operator = User.objects.create_user(
            email="operator@example.com", password=PASSWORD, is_staff=True
        )
        operator.user_permissions.set(
            Permission.objects.filter(
                content_type__app_label="accounts",
                codename__in=("add_user", "change_user", "view_user"),
            )
        )
        self.client.force_login(operator)

        page = self.client.get(self.url)
        self.assertEqual(page.status_code, 200)
        self.assertNotContains(page, 'name="dashboard_institution"')

        self.create(
            usable_password="true",
            password1=NEW_PASSWORD,
            password2=NEW_PASSWORD,
        )

        user = User.objects.get(email="ana@industria.example")
        self.assertFalse(InstitutionUser.objects.filter(user=user).exists())
        self.assertEqual(len(mail.outbox), 0)


class ForgotPasswordForInviteeTests(APITestCase):
    """The "¿Olvidaste tu contraseña?" of someone who never chose a password.

    ``PasswordResetForm`` skips accounts without a usable password, so the
    invitee is sent the invitation instead — and the caller cannot tell any
    of the cases apart.
    """

    def setUp(self):
        super().setUp()
        cache.clear()
        self.client = APIClient()
        self.url = reverse("institution-password-reset")
        self.institution = Institution.objects.create(legal_name="Colegio Ejemplo")
        self.invitee = make_invitee("pending@colegio.example", self.institution)
        self.member = User.objects.create_user(
            email="member@colegio.example", password=PASSWORD
        )
        InstitutionUser.objects.create(user=self.member, institution=self.institution)

    def forgot(self, email):
        return self.client.post(self.url, {"email": email}, format="json")

    def test_invitee_receives_the_invitation(self):
        response = self.forgot("Pending@Colegio.Example")

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual([m.to for m in mail.outbox], [[self.invitee.email]])
        query = link_query(mail.outbox[0].body)
        self.assertEqual(query["modo"], "crear")
        self.assertTrue(
            default_token_generator.check_token(self.invitee, query["token"])
        )

    def test_user_with_a_password_still_gets_the_reset_email(self):
        self.forgot(self.member.email)

        self.assertEqual([m.to for m in mail.outbox], [[self.member.email]])
        query = link_query(mail.outbox[0].body)
        self.assertNotIn("modo", query)
        self.assertTrue(
            default_token_generator.check_token(self.member, query["token"])
        )

    def test_unknown_address_sends_nothing(self):
        self.forgot("nobody@example.org")

        self.assertEqual(len(mail.outbox), 0)

    def test_the_three_cases_answer_identically(self):
        responses = [
            self.forgot(email)
            for email in (
                self.invitee.email,
                self.member.email,
                "nobody@example.org",
            )
        ]

        self.assertEqual({r.status_code for r in responses}, {204})
        self.assertEqual({r.content for r in responses}, {b""})
        self.assertEqual(
            {r.get("Content-Type") for r in responses},
            {responses[0].get("Content-Type")},
        )

    def test_a_failed_invitation_still_answers_204(self):
        with mock.patch(
            "api.invitations.EmailMultiAlternatives.send",
            side_effect=OSError("SMTP down"),
        ):
            with self.assertLogs("api.invitations", level="ERROR"):
                response = self.forgot(self.invitee.email)

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

    def test_invitees_share_the_password_reset_rate_limit(self):
        with mock.patch.dict(
            ScopedRateThrottle.THROTTLE_RATES, {"password_reset": "2/hour"}
        ):
            for _ in range(2):
                self.forgot(self.invitee.email)
            throttled = self.forgot(self.invitee.email)

        self.assertEqual(throttled.status_code, status.HTTP_429_TOO_MANY_REQUESTS)
        self.assertEqual(len(mail.outbox), 2)


class DisabledPasswordIsNotAnInvitationTests(APITestCase):
    """An operator disabling a dashboard user's password takes access away.

    Admin → user → Change password offers "Password-based authentication:
    Disabled", which leaves the account active, linked, and without a usable
    password — the same shape as an invitee. Neither "¿Sos nuevo en la
    plataforma?" nor "¿Olvidaste tu contraseña?" may hand that account a
    create-password link, or disabling the password would revoke nothing.
    """

    def setUp(self):
        super().setUp()
        cache.clear()
        self.institution = Institution.objects.create(legal_name="Colegio Ejemplo")
        self.member = User.objects.create_user(
            email="member@colegio.example", password=PASSWORD
        )
        InstitutionUser.objects.create(user=self.member, institution=self.institution)
        self.superuser = User.objects.create_superuser(
            email="admin@example.com", password="pw-Str0ng!42"
        )

        # The member has used the dashboard: a real sign-in, not a fixture.
        signed_in = APIClient().post(
            reverse("institution-login"),
            {"email": self.member.email, "password": PASSWORD},
            format="json",
        )
        self.assertEqual(signed_in.status_code, status.HTTP_200_OK)

        # The operator then disables their password from the Admin.
        operator = APIClient()
        operator.force_login(self.superuser)
        disabled = operator.post(
            reverse("admin:auth_user_password_change", args=[self.member.pk]),
            {
                "usable_password": "false",
                "password1": "",
                "password2": "",
                # The page's "Disable password-based authentication" button.
                "unset-password": "1",
            },
        )
        self.assertEqual(disabled.status_code, 302)
        self.member.refresh_from_db()
        self.assertFalse(self.member.has_usable_password())
        self.assertTrue(self.member.is_active)

        self.client = APIClient()
        mail.outbox.clear()

    def test_activate_sends_nothing(self):
        response = self.client.post(
            reverse("auth-activate"), {"email": self.member.email}, format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(len(mail.outbox), 0)

    def test_forgot_password_sends_nothing(self):
        response = self.client.post(
            reverse("institution-password-reset"),
            {"email": self.member.email},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(len(mail.outbox), 0)

    def test_admin_action_skips_them(self):
        operator = APIClient()
        operator.force_login(self.superuser)

        operator.post(
            reverse("admin:api_institution_changelist"),
            {
                "action": "send_dashboard_invitations",
                "_selected_action": [self.institution.pk],
            },
        )

        self.assertEqual(len(mail.outbox), 0)

    def test_change_password_page_says_how_to_revoke_access(self):
        self.member.set_password(PASSWORD)
        self.member.save()
        operator = APIClient()
        operator.force_login(self.superuser)

        response = operator.get(
            reverse("admin:auth_user_password_change", args=[self.member.pk])
        )

        self.assertContains(response, "To take away an institution user")
