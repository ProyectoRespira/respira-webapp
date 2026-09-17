from datetime import timedelta
from unittest.mock import patch

from django.conf import settings
from django.contrib.auth import get_user_model
from django.test import Client, TestCase
from django.urls import reverse
from django.utils import timezone

User = get_user_model()


class AuthConfigurationTests(TestCase):
    def test_uses_custom_user_model(self):
        self.assertEqual(settings.AUTH_USER_MODEL, "accounts.User")

    def test_model_backend_configured(self):
        self.assertIn(
            "django.contrib.auth.backends.ModelBackend",
            settings.AUTHENTICATION_BACKENDS,
        )

    def test_session_cookie_is_httponly(self):
        self.assertTrue(settings.SESSION_COOKIE_HTTPONLY)

    def test_csrf_middleware_enabled(self):
        self.assertIn("django.middleware.csrf.CsrfViewMiddleware", settings.MIDDLEWARE)

    def test_session_middleware_enabled(self):
        self.assertIn(
            "django.contrib.sessions.middleware.SessionMiddleware",
            settings.MIDDLEWARE,
        )


class SessionLifetimeSettingsTests(TestCase):
    """The agreed session duration (RES: ~5-minute logout report).

    Both administrative surfaces — the Django Admin backoffice and the
    institutional dashboard — run on this one session configuration, so these
    assertions cover them together.
    """

    def test_session_lasts_twenty_four_hours(self):
        self.assertEqual(settings.SESSION_COOKIE_AGE, 60 * 60 * 24)

    def test_session_expiry_slides_with_activity(self):
        # Without this, the 24 hours would be counted from login and an active
        # user would still be logged out mid-task.
        self.assertTrue(settings.SESSION_SAVE_EVERY_REQUEST)

    def test_session_survives_browser_close(self):
        self.assertFalse(settings.SESSION_EXPIRE_AT_BROWSER_CLOSE)


class SessionLifecycleTests(TestCase):
    def setUp(self):
        self.client = Client()
        self.password = "pw-Str0ng!42"
        self.admin = User.objects.create_superuser(
            email="admin@example.com", password=self.password
        )

    def test_session_created_on_login(self):
        self.assertNotIn("_auth_user_id", self.client.session)
        self.client.post(
            reverse("admin:login"),
            {
                "username": "admin@example.com",
                "password": self.password,
                "next": reverse("admin:index"),
            },
        )
        self.assertEqual(str(self.client.session["_auth_user_id"]), str(self.admin.pk))

    def test_session_invalidated_on_logout(self):
        self.client.force_login(self.admin)
        self.assertIn("_auth_user_id", self.client.session)
        self.client.logout()
        self.assertNotIn("_auth_user_id", self.client.session)

    def test_admin_sets_session_cookie_after_login(self):
        response = self.client.post(
            reverse("admin:login"),
            {
                "username": "admin@example.com",
                "password": self.password,
                "next": reverse("admin:index"),
            },
        )
        # Successful admin login redirects to the requested next page.
        self.assertEqual(response.status_code, 302)
        self.assertIn(settings.SESSION_COOKIE_NAME, response.cookies)

    def test_session_cookie_carries_the_full_lifetime(self):
        response = self.client.post(
            reverse("admin:login"),
            {
                "username": "admin@example.com",
                "password": self.password,
                "next": reverse("admin:index"),
            },
        )
        cookie = response.cookies[settings.SESSION_COOKIE_NAME]
        self.assertEqual(cookie["max-age"], settings.SESSION_COOKIE_AGE)

    def test_browsing_pushes_the_expiry_back(self):
        """A request made later must extend the session, not let it run down.

        This is the regression the ~5-minute logout report comes down to: with
        a non-sliding session, the expiry stamped at login stands no matter how
        recently the user clicked something, so the session dies mid-task.
        """
        from django.contrib.sessions.models import Session

        self.client.force_login(self.admin)
        session_key = self.client.session.session_key
        expiry_at_login = Session.objects.get(session_key=session_key).expire_date

        # Browse a page an hour later. The expiry must move with the clock.
        later = timezone.now() + timedelta(hours=1)
        with patch("django.utils.timezone.now", return_value=later):
            response = self.client.get(reverse("admin:index"))
            self.assertEqual(response.status_code, 200)

        renewed_expiry = Session.objects.get(session_key=session_key).expire_date
        self.assertEqual(
            renewed_expiry,
            later + timedelta(seconds=settings.SESSION_COOKIE_AGE),
        )
