from django.conf import settings
from django.contrib.auth import get_user_model
from django.test import Client, TestCase
from django.urls import reverse

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
        self.assertIn(
            "django.middleware.csrf.CsrfViewMiddleware", settings.MIDDLEWARE
        )

    def test_session_middleware_enabled(self):
        self.assertIn(
            "django.contrib.sessions.middleware.SessionMiddleware",
            settings.MIDDLEWARE,
        )


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
        self.assertEqual(
            str(self.client.session["_auth_user_id"]), str(self.admin.pk)
        )

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
