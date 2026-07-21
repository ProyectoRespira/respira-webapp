from django.contrib.auth import get_user_model
from django.test import Client, TestCase
from django.urls import reverse

User = get_user_model()


class PublicAdminSeparationTests(TestCase):
    """Public site (/api/) stays open; the backoffice (/admin/) requires auth."""

    def setUp(self):
        self.client = Client()

    def test_public_api_health_accessible_without_auth(self):
        response = self.client.get(reverse("health"))
        self.assertEqual(response.status_code, 200)

    def test_public_api_schema_accessible_without_auth(self):
        response = self.client.get(reverse("schema"))
        self.assertEqual(response.status_code, 200)

    def test_admin_redirects_to_login_when_unauthenticated(self):
        response = self.client.get(reverse("admin:index"))
        self.assertEqual(response.status_code, 302)
        self.assertIn(reverse("admin:login"), response["Location"])

    def test_admin_accessible_when_authenticated(self):
        admin = User.objects.create_superuser(
            email="admin@example.com", password="pw-Str0ng!42"
        )
        self.client.force_login(admin)
        response = self.client.get(reverse("admin:index"))
        self.assertEqual(response.status_code, 200)
