from unittest import mock

import backend.settings as project_settings
from axes.models import AccessAttempt
from backend.client_ip import get_client_ip
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.contrib.auth.password_validation import validate_password
from django.test import Client, RequestFactory, TestCase, override_settings
from django.urls import reverse

User = get_user_model()

STRONG_PW = "pw-Str0ng!42"


class SecuritySettingsTests(TestCase):
    def test_blank_numeric_env_uses_default(self):
        with mock.patch.dict("os.environ", {"BACKEND_PASSWORD_MIN_LENGTH": "   "}):
            self.assertEqual(
                project_settings._env_int("BACKEND_PASSWORD_MIN_LENGTH", 10), 10
            )

    def test_blank_string_env_uses_default(self):
        with mock.patch.dict("os.environ", {"BACKEND_SESSION_COOKIE_SAMESITE": ""}):
            self.assertEqual(
                project_settings._env_str("BACKEND_SESSION_COOKIE_SAMESITE", "Lax"),
                "Lax",
            )

    def test_whitespace_string_env_uses_default(self):
        with mock.patch.dict("os.environ", {"BACKEND_SESSION_COOKIE_SAMESITE": "   "}):
            self.assertEqual(
                project_settings._env_str("BACKEND_SESSION_COOKIE_SAMESITE", "Lax"),
                "Lax",
            )

    def test_whitespace_bool_env_uses_default(self):
        with mock.patch.dict("os.environ", {"BACKEND_SECURE_SSL_REDIRECT": "   "}):
            self.assertTrue(
                project_settings._env_bool("BACKEND_SECURE_SSL_REDIRECT", True)
            )

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


# Every request reaches Django from the nginx container, so REMOTE_ADDR is the
# same for everyone; these tests pin it to that shape and vary X-Real-IP the
# way nginx would.
PROXY_ADDR = "172.19.0.4"
IP_X = "203.0.113.10"
IP_Y = "198.51.100.20"


@override_settings(AXES_ENABLED=True, CLIENT_IP_TRUST_PROXY_HEADER=True)
class LockoutScopeTests(TestCase):
    """A lockout covers one username+client-IP pair and nothing else."""

    def setUp(self):
        self.user_a = User.objects.create_superuser(
            email="a@example.com", password=STRONG_PW
        )
        self.user_b = User.objects.create_superuser(
            email="b@example.com", password=STRONG_PW
        )

    def _post(self, email, password, ip, **extra):
        return Client().post(
            reverse("admin:login"),
            {"username": email, "password": password, "next": reverse("admin:index")},
            REMOTE_ADDR=PROXY_ADDR,
            HTTP_X_REAL_IP=ip,
            **extra,
        )

    def _lock_out(self, email, ip, **extra):
        for _ in range(settings.AXES_FAILURE_LIMIT):
            self._post(email, "wrong-password", ip, **extra)

    def _assert_locked(self, email, ip):
        self.assertIn(self._post(email, STRONG_PW, ip).status_code, (403, 429))

    def _assert_logs_in(self, email, ip):
        response = self._post(email, STRONG_PW, ip)
        self.assertEqual(response.status_code, 302)
        self.assertEqual(response.url, reverse("admin:index"))

    def test_lockout_is_keyed_on_username_and_ip_together(self):
        self.assertEqual(settings.AXES_LOCKOUT_PARAMETERS, [["username", "ip_address"]])

    def test_failures_during_lockout_do_not_extend_it(self):
        self.assertFalse(settings.AXES_RESET_COOL_OFF_ON_FAILURE_DURING_LOCKOUT)

    def test_locked_pair_is_locked(self):
        self._lock_out("a@example.com", IP_X)
        self._assert_locked("a@example.com", IP_X)

    def test_other_user_on_same_ip_is_not_locked(self):
        self._lock_out("a@example.com", IP_X)
        self._assert_logs_in("b@example.com", IP_X)

    def test_other_user_on_other_ip_is_not_locked(self):
        self._lock_out("a@example.com", IP_X)
        self._assert_logs_in("b@example.com", IP_Y)

    def test_same_user_on_other_ip_is_not_locked(self):
        self._lock_out("a@example.com", IP_X)
        self._assert_logs_in("a@example.com", IP_Y)

    def test_failures_for_many_usernames_do_not_lock_anyone_else(self):
        # The original bug: failures for arbitrary usernames, all seen through
        # the proxy, locked out every account.
        for i in range(settings.AXES_FAILURE_LIMIT):
            self._post(f"nobody{i}@example.com", "wrong-password", IP_X)
        self._assert_logs_in("a@example.com", IP_X)

    def test_attempts_record_the_client_ip_not_the_proxy(self):
        self._post("a@example.com", "wrong-password", IP_X)
        self.assertEqual(
            list(AccessAttempt.objects.values_list("ip_address", flat=True)), [IP_X]
        )

    def test_forged_x_forwarded_for_does_not_change_the_ip(self):
        # nginx appends the real address to X-Forwarded-For, so a client can
        # put anything in front of it; rotating it must not dodge the lockout.
        for i in range(settings.AXES_FAILURE_LIMIT):
            self._post(
                "a@example.com",
                "wrong-password",
                IP_X,
                HTTP_X_FORWARDED_FOR=f"10.0.0.{i}, {IP_X}",
            )
        self._assert_locked("a@example.com", IP_X)


class ClientIpTests(TestCase):
    def _request(self, **meta):
        return RequestFactory().get("/", REMOTE_ADDR=PROXY_ADDR, **meta)

    @override_settings(CLIENT_IP_TRUST_PROXY_HEADER=True)
    def test_uses_x_real_ip_from_proxy(self):
        request = self._request(HTTP_X_REAL_IP=IP_X, HTTP_X_FORWARDED_FOR="1.2.3.4")
        self.assertEqual(get_client_ip(request), IP_X)

    @override_settings(CLIENT_IP_TRUST_PROXY_HEADER=True)
    def test_falls_back_to_remote_addr_without_header(self):
        self.assertEqual(get_client_ip(self._request()), PROXY_ADDR)

    @override_settings(CLIENT_IP_TRUST_PROXY_HEADER=False)
    def test_ignores_header_when_proxy_not_trusted(self):
        request = self._request(HTTP_X_REAL_IP=IP_X)
        self.assertEqual(get_client_ip(request), PROXY_ADDR)
