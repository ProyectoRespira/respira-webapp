from unittest import mock

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.test import TestCase

User = get_user_model()


class BootstrapSuperuserTests(TestCase):
    def test_noop_when_env_not_set(self):
        with mock.patch.dict(
            "os.environ",
            {"BACKEND_SUPERUSER_EMAIL": "", "BACKEND_SUPERUSER_PASSWORD": ""},
        ):
            call_command("bootstrap_superuser")
        self.assertFalse(User.objects.filter(is_superuser=True).exists())

    def test_creates_superuser_when_env_set(self):
        with mock.patch.dict(
            "os.environ",
            {
                "BACKEND_SUPERUSER_EMAIL": "boot@example.com",
                "BACKEND_SUPERUSER_PASSWORD": "Str0ng-Bootstrap!1",
            },
        ):
            call_command("bootstrap_superuser")

        user = User.objects.get(email="boot@example.com")
        self.assertTrue(user.is_superuser)
        self.assertTrue(user.is_staff)
        self.assertTrue(user.check_password("Str0ng-Bootstrap!1"))

    def test_is_idempotent_and_does_not_reset_password(self):
        env = {
            "BACKEND_SUPERUSER_EMAIL": "boot@example.com",
            "BACKEND_SUPERUSER_PASSWORD": "Str0ng-Bootstrap!1",
        }
        with mock.patch.dict("os.environ", env):
            call_command("bootstrap_superuser")
        # Second run with a different password must NOT change the account.
        with mock.patch.dict(
            "os.environ",
            {**env, "BACKEND_SUPERUSER_PASSWORD": "A-Different-Pw!9"},
        ):
            call_command("bootstrap_superuser")

        self.assertEqual(User.objects.filter(email="boot@example.com").count(), 1)
        user = User.objects.get(email="boot@example.com")
        self.assertTrue(user.check_password("Str0ng-Bootstrap!1"))
