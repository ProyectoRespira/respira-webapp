from django.contrib import admin
from django.contrib.auth import get_user_model
from django.test import Client, TestCase
from django.urls import reverse

User = get_user_model()

STRONG_PW = "pw-Str0ng!42"


class AuthWorkflowTests(TestCase):
    """Ticket 1 — login, logout, session, redirects, inactive users, errors."""

    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_superuser(
            email="admin@example.com", password=STRONG_PW
        )

    def test_login_success(self):
        response = self.client.post(
            reverse("admin:login"),
            {"username": "admin@example.com", "password": STRONG_PW,
             "next": reverse("admin:index")},
        )
        self.assertEqual(response.status_code, 302)
        self.assertEqual(response["Location"], reverse("admin:index"))

    def test_invalid_credentials_do_not_authenticate(self):
        response = self.client.post(
            reverse("admin:login"),
            {"username": "admin@example.com", "password": "wrong"},
        )
        self.assertEqual(response.status_code, 200)  # re-render with error
        self.assertNotIn("_auth_user_id", self.client.session)

    def test_inactive_user_cannot_log_in(self):
        self.user.is_active = False
        self.user.save()
        response = self.client.post(
            reverse("admin:login"),
            {"username": "admin@example.com", "password": STRONG_PW},
        )
        self.assertEqual(response.status_code, 200)  # re-render, not redirect
        self.assertNotIn("_auth_user_id", self.client.session)

    def test_generic_error_message_does_not_leak_which_field(self):
        # Wrong password for an existing user, and a non-existent user, must
        # produce the same generic error (no account enumeration).
        r1 = self.client.post(
            reverse("admin:login"),
            {"username": "admin@example.com", "password": "wrong"},
        )
        r2 = self.client.post(
            reverse("admin:login"),
            {"username": "ghost@example.com", "password": "wrong"},
        )
        self.assertContains(r1, "Please enter the correct", status_code=200)
        self.assertContains(r2, "Please enter the correct", status_code=200)

    def test_logout_invalidates_session(self):
        self.client.force_login(self.user)
        self.assertIn("_auth_user_id", self.client.session)
        self.client.post(reverse("admin:logout"))
        self.assertNotIn("_auth_user_id", self.client.session)

    def test_protected_page_redirects_when_unauthenticated(self):
        response = self.client.get(reverse("admin:index"))
        self.assertEqual(response.status_code, 302)
        self.assertIn(reverse("admin:login"), response["Location"])

    def test_login_form_has_csrf_token(self):
        response = self.client.get(reverse("admin:login"))
        self.assertContains(response, "csrfmiddlewaretoken")


class PasswordManagementTests(TestCase):
    """Ticket 4 — admin-assisted reset, validators, hashing, login after reset."""

    def setUp(self):
        self.client = Client()
        self.admin = User.objects.create_superuser(
            email="admin@example.com", password=STRONG_PW
        )
        self.target = User.objects.create_user(
            email="member@example.com", password="old-Pw-9988", is_staff=True
        )
        self.client.force_login(self.admin)

    def _password_change_url(self):
        # UserAdmin registers this URL under a fixed name in Django 4.2.
        return reverse("admin:auth_user_password_change", args=[self.target.pk])

    def test_admin_can_reset_another_users_password(self):
        new_pw = "brand-New-Pw-7788"
        response = self.client.post(
            self._password_change_url(),
            {"password1": new_pw, "password2": new_pw},
        )
        self.assertEqual(response.status_code, 302)
        self.target.refresh_from_db()
        self.assertTrue(self.target.check_password(new_pw))

    def test_reset_password_is_hashed(self):
        new_pw = "brand-New-Pw-7788"
        self.client.post(
            self._password_change_url(),
            {"password1": new_pw, "password2": new_pw},
        )
        self.target.refresh_from_db()
        self.assertNotEqual(self.target.password, new_pw)
        self.assertTrue(self.target.password.startswith(("pbkdf2_", "argon2", "bcrypt")))

    def test_user_can_authenticate_after_reset(self):
        new_pw = "brand-New-Pw-7788"
        self.client.post(
            self._password_change_url(),
            {"password1": new_pw, "password2": new_pw},
        )
        fresh = Client()
        response = fresh.post(
            reverse("admin:login"),
            {
                "username": "member@example.com",
                "password": new_pw,
                "next": reverse("admin:index"),
            },
        )
        self.assertIn("_auth_user_id", fresh.session)

    def test_password_validators_reject_weak_password(self):
        response = self.client.post(
            self._password_change_url(),
            {"password1": "123", "password2": "123"},
        )
        self.assertEqual(response.status_code, 200)  # re-render with errors
        self.target.refresh_from_db()
        self.assertFalse(self.target.check_password("123"))


class BrandingTests(TestCase):
    """Ticket 8 — admin branding and page navigation."""

    def test_branding_configured(self):
        self.assertEqual(admin.site.site_header, "Proyecto Respira — Administration")
        self.assertEqual(admin.site.site_title, "Proyecto Respira Admin")
        self.assertEqual(admin.site.index_title, "Station Administration")

    def test_branding_rendered_on_login_page(self):
        response = Client().get(reverse("admin:login"))
        self.assertContains(response, "Proyecto Respira")

    def test_password_change_page_reachable_for_logged_in_user(self):
        client = Client()
        user = User.objects.create_superuser(
            email="admin@example.com", password=STRONG_PW
        )
        client.force_login(user)
        response = client.get(reverse("admin:password_change"))
        self.assertEqual(response.status_code, 200)
