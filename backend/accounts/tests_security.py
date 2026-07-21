from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.contrib.auth.password_validation import validate_password
from django.test import Client, TestCase, override_settings
from django.urls import reverse

User = get_user_model()

STRONG_PW = "pw-Str0ng!42"


class SecuritySettingsTests(TestCase):
    def test_clickjacking_protection_denies_framing(self):
        self.assertEqual(settings.X_FRAME_OPTIONS, "DENY")
        self.assertIn(
            "django.middleware.clickjacking.XFrameOptionsMiddleware",
            settings.MIDDLEWARE,
        )

    def test_content_type_nosniff_enabled(self):
        self.assertTrue(settings.SECURE_CONTENT_TYPE_NOSNIFF)

    def test_session_cookie_httponly(self):
        self.assertTrue(settings.SESSION_COOKIE_HTTPONLY)

    def test_axes_configured(self):
        self.assertIn("axes", settings.INSTALLED_APPS)
        self.assertIn(
            "axes.backends.AxesStandaloneBackend",
            settings.AUTHENTICATION_BACKENDS,
        )
        self.assertEqual(
            settings.AUTHENTICATION_BACKENDS[0], "axes.backends.AxesStandaloneBackend"
        )
        self.assertTrue(settings.AXES_FAILURE_LIMIT >= 1)


class PasswordPolicyTests(TestCase):
    def test_minimum_length_enforced(self):
        with self.assertRaises(ValidationError):
            validate_password("aB3$xy")  # 6 chars, below min length

    def test_complexity_requires_digit_and_special(self):
        with self.assertRaises(ValidationError):
            validate_password("onlyletters")  # no digit/special

    def test_strong_password_passes(self):
        # Should not raise.
        validate_password("Str0ng-Passphrase!7")


@override_settings(AXES_ENABLED=True)
class LoginRateLimitTests(TestCase):
    def setUp(self):
        self.client = Client()
        self.password = STRONG_PW
        self.user = User.objects.create_superuser(
            email="admin@example.com", password=self.password
        )

    def _fail_login(self):
        return self.client.post(
            reverse("admin:login"),
            {"username": "admin@example.com", "password": "wrong-password"},
        )

    def test_login_is_rate_limited_after_repeated_failures(self):
        for _ in range(settings.AXES_FAILURE_LIMIT):
            self._fail_login()

        # After hitting the limit, even correct credentials are locked out.
        response = self.client.post(
            reverse("admin:login"),
            {
                "username": "admin@example.com",
                "password": self.password,
                "next": reverse("admin:index"),
            },
        )
        self.assertIn(response.status_code, (403, 429))
        self.assertNotIn("_auth_user_id", self.client.session)
