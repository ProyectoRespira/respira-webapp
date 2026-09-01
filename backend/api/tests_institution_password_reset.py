"""Tests for self-service password recovery (RES-4xx).

Two entry points share one mechanism — Django's `default_token_generator` and
the `AUTH_PASSWORD_VALIDATORS` pipeline:

  * the institutional API (`/api/institution/password-reset/` and
    `.../confirm/`), which the public site's reset pages call, and
  * the Django Admin's own reset views, wired in `backend/backend/urls.py`.

The properties worth pinning down are the ones a reviewer would ask about: a
link that expires, cannot be reused, cannot be tampered with, does not tell a
stranger which addresses are registered, and actually replaces the password.
"""

import re
import uuid
from datetime import datetime, timedelta
from unittest import mock

from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import (
    PasswordResetTokenGenerator,
    default_token_generator,
)
from django.core import mail
from django.core.cache import cache
from django.test import override_settings
from django.urls import reverse
from django.utils.http import urlsafe_base64_encode
from django.utils.encoding import force_bytes
from rest_framework import status
from rest_framework.test import APIClient, APITestCase
from rest_framework.throttling import ScopedRateThrottle

from .models import Institution, InstitutionUser

User = get_user_model()

CURRENT_PASSWORD = "S3ed!Pass99"
NEW_PASSWORD = "N3w!Passw0rd42"


def link_parts(body: str) -> tuple[str, str]:
    """Pulls `uid` and `token` back out of a sent reset email."""
    match = re.search(r"[?&]uid=([^&\s]+)&token=([^\s]+)", body)
    assert match is not None, f"No reset link found in email body:\n{body}"
    return match.group(1), match.group(2)


def uid_for(pk) -> str:
    return urlsafe_base64_encode(force_bytes(pk))


class ThrottleFreeTestCase(APITestCase):
    """Base case that keeps the per-IP reset throttles out of the way.

    The rates live in the cache and in `SimpleRateThrottle.THROTTLE_RATES`,
    which DRF binds at import time — `override_settings(REST_FRAMEWORK=...)`
    does not reach it. Clearing the cache per test is what keeps one test's
    requests from counting against the next one's budget.
    """

    def setUp(self):
        super().setUp()
        cache.clear()


class InstitutionPasswordResetRequestTests(ThrottleFreeTestCase):
    """`POST /api/institution/password-reset/` — asking for the email."""

    def setUp(self):
        super().setUp()
        self.client = APIClient()
        self.url = reverse("institution-password-reset")

        self.institution = Institution.objects.create(legal_name="Hospital Bautista")
        self.user = User.objects.create_user(
            username="contact@hospitalbautista.org.py",
            email="contact@hospitalbautista.org.py",
            password=CURRENT_PASSWORD,
        )
        InstitutionUser.objects.create(user=self.user, institution=self.institution)

    def test_known_address_receives_a_reset_email(self):
        response = self.client.post(self.url, {"email": self.user.email}, format="json")

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, [self.user.email])

        uid, token = link_parts(mail.outbox[0].body)
        self.assertEqual(uid, uid_for(self.user.pk))
        self.assertTrue(default_token_generator.check_token(self.user, token))

    def test_link_points_at_the_requesting_host(self):
        """No hardcoded environment: scheme and host come from the request."""
        self.client.post(
            self.url,
            {"email": self.user.email},
            format="json",
            HTTP_HOST="demo.proyectorespira.net",
            secure=True,
        )

        self.assertIn(
            "https://demo.proyectorespira.net/institucion/restablecer-clave",
            mail.outbox[0].body,
        )

    def test_email_carries_a_branded_html_part(self):
        """Multipart: plain text stays the body, HTML rides as the alternative.

        Both parts must offer the same link — a reader whose client strips HTML
        has to be able to finish the reset from the text one.
        """
        self.client.post(self.url, {"email": self.user.email}, format="json")
        message = mail.outbox[0]

        self.assertEqual(len(message.alternatives), 1)
        html, mime_type = message.alternatives[0]
        self.assertEqual(mime_type, "text/html")

        uid, token = link_parts(message.body)
        self.assertIn(f"uid={uid}&token={token}", html)
        self.assertIn("<img", html)

        # Template syntax must never survive into a sent message. Django's
        # `{# #}` comments only match within one line, so a multi-line one is
        # rendered as visible text rather than stripped.
        for leftover in ("{#", "#}", "{%", "%}", "{{", "}}"):
            self.assertNotIn(leftover, html)

    def test_logo_resolves_against_the_requesting_host(self):
        """The mail client fetches it, so it must be an absolute public URL."""
        self.client.post(
            self.url,
            {"email": self.user.email},
            format="json",
            HTTP_HOST="demo.proyectorespira.net",
            secure=True,
        )

        html = mail.outbox[0].alternatives[0][0]
        self.assertIn(
            'src="https://demo.proyectorespira.net/favicon.png"',
            html,
        )

    def test_unknown_address_is_answered_the_same_way(self):
        """The response must not reveal whether an account exists."""
        known = self.client.post(self.url, {"email": self.user.email}, format="json")
        mail.outbox.clear()
        unknown = self.client.post(
            self.url, {"email": "nobody@example.org"}, format="json"
        )

        self.assertEqual(unknown.status_code, known.status_code)
        self.assertEqual(unknown.content, known.content)
        self.assertEqual(len(mail.outbox), 0)

    def test_inactive_account_gets_no_email_and_no_hint(self):
        self.user.is_active = False
        self.user.save(update_fields=["is_active"])

        response = self.client.post(self.url, {"email": self.user.email}, format="json")

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(len(mail.outbox), 0)

    def test_admin_account_may_also_recover_through_this_endpoint(self):
        """Administrators are not required to have an institution linked."""
        admin = User.objects.create_superuser(
            username="ops@proyectorespira.net",
            email="ops@proyectorespira.net",
            password=CURRENT_PASSWORD,
        )

        self.client.post(self.url, {"email": admin.email}, format="json")

        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, [admin.email])

    def test_malformed_address_is_rejected(self):
        response = self.client.post(self.url, {"email": "not-an-email"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(len(mail.outbox), 0)

    def test_requests_are_rate_limited(self):
        """A caller cannot use this endpoint to flood an inbox."""
        with mock.patch.dict(
            ScopedRateThrottle.THROTTLE_RATES, {"password_reset": "2/hour"}
        ):
            for _ in range(2):
                self.client.post(self.url, {"email": self.user.email}, format="json")

            throttled = self.client.post(
                self.url, {"email": self.user.email}, format="json"
            )

        self.assertEqual(throttled.status_code, status.HTTP_429_TOO_MANY_REQUESTS)
        self.assertEqual(len(mail.outbox), 2)


class InstitutionPasswordResetConfirmTests(ThrottleFreeTestCase):
    """`POST /api/institution/password-reset/confirm/` — setting the password."""

    def setUp(self):
        super().setUp()
        self.client = APIClient()
        self.confirm_url = reverse("institution-password-reset-confirm")
        self.login_url = reverse("institution-login")

        self.institution = Institution.objects.create(legal_name="Hospital Bautista")
        self.user = User.objects.create_user(
            username="contact@hospitalbautista.org.py",
            email="contact@hospitalbautista.org.py",
            password=CURRENT_PASSWORD,
        )
        InstitutionUser.objects.create(user=self.user, institution=self.institution)

        self.client.post(
            reverse("institution-password-reset"),
            {"email": self.user.email},
            format="json",
        )
        self.uid, self.token = link_parts(mail.outbox[0].body)
        mail.outbox.clear()

    def confirm(self, **overrides):
        payload = {
            "uid": self.uid,
            "token": self.token,
            "new_password": NEW_PASSWORD,
        }
        payload.update(overrides)
        return self.client.post(self.confirm_url, payload, format="json")

    def test_valid_link_sets_the_new_password(self):
        response = self.confirm()

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password(NEW_PASSWORD))

    def test_new_password_works_at_login_and_the_old_one_does_not(self):
        self.confirm()

        rejected = self.client.post(
            self.login_url,
            {"email": self.user.email, "password": CURRENT_PASSWORD},
            format="json",
        )
        self.assertEqual(rejected.status_code, status.HTTP_400_BAD_REQUEST)

        accepted = self.client.post(
            self.login_url,
            {"email": self.user.email, "password": NEW_PASSWORD},
            format="json",
        )
        self.assertEqual(accepted.status_code, status.HTTP_200_OK)

    def test_a_consumed_link_cannot_be_replayed(self):
        self.assertEqual(self.confirm().status_code, status.HTTP_204_NO_CONTENT)

        replay = self.confirm(new_password="An0ther!Passw0rd")

        self.assertEqual(replay.status_code, status.HTTP_400_BAD_REQUEST)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password(NEW_PASSWORD))

    def test_tampered_token_is_rejected(self):
        response = self.confirm(token=self.token[:-1] + "x")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password(CURRENT_PASSWORD))

    def test_uid_pointing_at_another_account_is_rejected(self):
        """The token is bound to one user; swapping the uid must not work."""
        other = User.objects.create_user(
            username="other@example.org",
            email="other@example.org",
            password=CURRENT_PASSWORD,
        )

        response = self.confirm(uid=uid_for(other.pk))

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        other.refresh_from_db()
        self.assertTrue(other.check_password(CURRENT_PASSWORD))

    def test_unreadable_uid_is_rejected(self):
        response = self.confirm(uid="not-base64")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    @override_settings(PASSWORD_RESET_TIMEOUT=24 * 3600)
    def test_expired_link_is_rejected(self):
        """A link issued two days ago no longer opens a 24-hour window."""
        two_days_ago = datetime.now() - timedelta(days=2)
        with mock.patch.object(
            PasswordResetTokenGenerator, "_now", return_value=two_days_ago
        ):
            stale_token = default_token_generator.make_token(self.user)

        response = self.confirm(token=stale_token)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password(CURRENT_PASSWORD))

    def test_invalid_and_expired_links_report_the_same_message(self):
        """One message for every unusable link — the uid is not an oracle."""
        unknown_user = self.confirm(uid=uid_for(uuid.uuid4()))
        unreadable = self.confirm(uid="not-base64")
        bad_token = self.confirm(token="wrong-token")

        self.assertEqual(unknown_user.json(), bad_token.json())
        self.assertEqual(unreadable.json(), bad_token.json())

    def test_password_rules_are_enforced(self):
        response = self.confirm(new_password="short")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("new_password", response.json())
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password(CURRENT_PASSWORD))

    def test_a_rejected_password_leaves_the_link_usable(self):
        self.confirm(new_password="short")

        retried = self.confirm()

        self.assertEqual(retried.status_code, status.HTTP_204_NO_CONTENT)

    def test_logging_in_invalidates_a_pending_link(self):
        """`last_login` feeds the token, so remembering the password kills it."""
        self.client.post(
            self.login_url,
            {"email": self.user.email, "password": CURRENT_PASSWORD},
            format="json",
        )

        self.assertEqual(self.confirm().status_code, status.HTTP_400_BAD_REQUEST)

    def test_existing_sessions_die_with_the_old_password(self):
        session_client = APIClient()
        session_client.post(
            self.login_url,
            {"email": self.user.email, "password": CURRENT_PASSWORD},
            format="json",
        )
        self.assertEqual(
            session_client.get(reverse("institution-me")).status_code,
            status.HTTP_200_OK,
        )

        # Asked for *after* the login above: that login bumped `last_login`,
        # which the token hashes, so the link made in `setUp` is already stale.
        self.client.post(
            reverse("institution-password-reset"),
            {"email": self.user.email},
            format="json",
        )
        uid, token = link_parts(mail.outbox[-1].body)
        self.assertEqual(
            self.confirm(uid=uid, token=token).status_code,
            status.HTTP_204_NO_CONTENT,
        )

        self.assertIn(
            session_client.get(reverse("institution-me")).status_code,
            (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN),
        )


class AdminPasswordResetTests(ThrottleFreeTestCase):
    """The backoffice flow, served by Django's own views under `/admin/`."""

    def setUp(self):
        super().setUp()
        self.client = APIClient()
        self.admin = User.objects.create_superuser(
            username="ops@proyectorespira.net",
            email="ops@proyectorespira.net",
            password=CURRENT_PASSWORD,
        )

    def test_admin_login_page_offers_the_reset_link(self):
        """The template renders it only when `admin_password_reset` resolves."""
        response = self.client.get(reverse("admin:login"))

        self.assertContains(response, reverse("admin_password_reset"))

    def test_reset_paths_live_under_admin_so_the_proxy_routes_them(self):
        # Only /admin/, /api/ and /static/ reach Django (proxy/nginx.conf.template).
        for name, kwargs in (
            ("admin_password_reset", {}),
            ("password_reset_done", {}),
            ("password_reset_confirm", {"uidb64": "MQ", "token": "set-password"}),
            ("password_reset_complete", {}),
        ):
            with self.subTest(url=name):
                self.assertTrue(reverse(name, kwargs=kwargs).startswith("/admin/"))

    def test_full_admin_reset_changes_the_password(self):
        self.client.post(
            reverse("admin_password_reset"), {"email": self.admin.email}, follow=True
        )
        self.assertEqual(len(mail.outbox), 1)

        link = re.search(r"/admin/reset/[^\s]+", mail.outbox[0].body)
        self.assertIsNotNone(link)

        # Django's confirm view swaps the token for a one-shot session value and
        # redirects to `set-password`, which is where the form is posted.
        form_page = self.client.get(link.group(0), follow=True)
        response = self.client.post(
            form_page.redirect_chain[-1][0],
            {"new_password1": NEW_PASSWORD, "new_password2": NEW_PASSWORD},
        )
        self.assertEqual(response.status_code, status.HTTP_302_FOUND)

        self.admin.refresh_from_db()
        self.assertTrue(self.admin.check_password(NEW_PASSWORD))

    def test_unknown_address_is_not_revealed(self):
        response = self.client.post(
            reverse("admin_password_reset"), {"email": "nobody@example.org"}
        )

        self.assertEqual(response.status_code, status.HTTP_302_FOUND)
        self.assertEqual(response.url, reverse("password_reset_done"))
        self.assertEqual(len(mail.outbox), 0)
