import uuid

from django.contrib.auth import get_user_model
from django.test import Client, TestCase
from django.urls import reverse

from accounts.models import Role

User = get_user_model()


class CustomUserModelTests(TestCase):
    def test_username_field_is_email(self):
        self.assertEqual(User.USERNAME_FIELD, "email")
        self.assertNotIn("email", User.REQUIRED_FIELDS)

    def test_primary_key_is_uuid(self):
        user = User.objects.create_user(email="uuid@example.com", password="pw-Str0ng!")
        self.assertIsInstance(user.pk, uuid.UUID)

    def test_create_user_hashes_password(self):
        user = User.objects.create_user(email="user@example.com", password="pw-Str0ng!")
        self.assertEqual(user.email, "user@example.com")
        self.assertNotEqual(user.password, "pw-Str0ng!")
        self.assertTrue(user.check_password("pw-Str0ng!"))
        self.assertFalse(user.is_staff)
        self.assertFalse(user.is_superuser)

    def test_create_user_requires_email(self):
        with self.assertRaises(ValueError):
            User.objects.create_user(email="", password="pw-Str0ng!")

    def test_email_is_normalized(self):
        user = User.objects.create_user(email="user@EXAMPLE.COM", password="pw-Str0ng!")
        self.assertEqual(user.email, "user@example.com")

    def test_create_superuser(self):
        admin = User.objects.create_superuser(
            email="admin@example.com", password="pw-Str0ng!"
        )
        self.assertTrue(admin.is_staff)
        self.assertTrue(admin.is_superuser)

    def test_create_superuser_rejects_non_staff(self):
        with self.assertRaises(ValueError):
            User.objects.create_superuser(
                email="admin@example.com", password="pw-Str0ng!", is_staff=False
            )


class RoleTests(TestCase):
    def test_default_roles_seeded(self):
        slugs = set(Role.objects.values_list("slug", flat=True))
        self.assertTrue({"superadmin", "admin", "editor", "viewer"}.issubset(slugs))

    def test_assign_role_to_user(self):
        editor = Role.objects.get(slug="editor")
        user = User.objects.create_user(
            email="editor@example.com", password="pw-Str0ng!", role=editor
        )
        user.refresh_from_db()
        self.assertEqual(user.role, editor)
        self.assertIn(user, editor.users.all())

    def test_deleting_role_nulls_user_role(self):
        role = Role.objects.create(name="Temp", slug="temp")
        user = User.objects.create_user(
            email="temp@example.com", password="pw-Str0ng!", role=role
        )
        role.delete()
        user.refresh_from_db()
        self.assertIsNone(user.role)


class AdminAuthenticationTests(TestCase):
    def setUp(self):
        self.client = Client()
        self.password = "pw-Str0ng!42"
        self.admin = User.objects.create_superuser(
            email="admin@example.com", password=self.password
        )

    def test_admin_login_with_custom_user_model(self):
        # django-axes requires the request object, so authenticate via the
        # admin login view rather than client.login().
        response = self.client.post(
            reverse("admin:login"),
            {
                "username": "admin@example.com",
                "password": self.password,
                "next": reverse("admin:index"),
            },
        )
        self.assertEqual(response.status_code, 302)
        self.assertIn("_auth_user_id", self.client.session)

    def test_admin_index_accessible_when_authenticated(self):
        self.client.force_login(self.admin)
        response = self.client.get(reverse("admin:index"))
        self.assertEqual(response.status_code, 200)
