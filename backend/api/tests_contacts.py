"""Tests for the Contacts module in Django Admin.

Covers the centralized contact list and its optional, one-to-one link to a
platform user: the Contacts changelist, and the Contact selector added to the
user add/change forms by ``accounts.forms.ContactSelectionMixin``.
"""

from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from django.test import TestCase
from django.urls import reverse

from accounts.forms import UserChangeForm, UserCreationForm

from .models import Contact

User = get_user_model()


class ContactModelTests(TestCase):
    def test_contact_exists_without_a_user(self):
        contact = Contact.objects.create(
            name="Ana Benítez",
            description="Coordinadora de salud ambiental",
            institution="Ministerio de Salud",
            phone="+595 981 000000",
        )
        self.assertIsNone(contact.user)
        self.assertEqual(str(contact), "Ana Benítez")

    def test_only_name_is_required(self):
        contact = Contact.objects.create(name="Solo nombre")
        self.assertEqual(contact.description, "")
        self.assertEqual(contact.institution, "")
        self.assertEqual(contact.phone, "")

    def test_same_contact_cannot_back_two_users(self):
        contact = Contact.objects.create(name="Ana Benítez")
        first = User.objects.create_user(
            email="ana@example.com", password="pw-Str0ng!42"
        )
        second = User.objects.create_user(
            email="otra@example.com", password="pw-Str0ng!42"
        )

        contact.user = first
        contact.save()

        # The OneToOne's unique index is what enforces this, not custom code.
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                Contact.objects.create(name="Duplicada", user=first)

        duplicate = Contact.objects.create(name="Otra persona", user=second)
        self.assertEqual(duplicate.user, second)

    def test_deleting_a_user_keeps_the_contact(self):
        user = User.objects.create_user(
            email="ana@example.com", password="pw-Str0ng!42"
        )
        contact = Contact.objects.create(name="Ana Benítez", user=user)

        user.delete()

        contact.refresh_from_db()
        self.assertIsNone(contact.user)
        self.assertEqual(contact.name, "Ana Benítez")


class ContactUserFormTests(TestCase):
    """The optional selector the admin user forms expose."""

    def setUp(self):
        self.contact = Contact.objects.create(
            name="Ana Benítez", institution="Ministerio de Salud"
        )

    def _creation_data(self, **overrides):
        data = {
            "email": "nueva@example.com",
            "password1": "pw-Str0ng!42",
            "password2": "pw-Str0ng!42",
        }
        data.update(overrides)
        return data

    def test_contact_is_optional_when_creating_a_user(self):
        form = UserCreationForm(data=self._creation_data())
        self.assertTrue(form.is_valid(), form.errors)
        user = form.save()
        self.assertFalse(Contact.objects.filter(user=user).exists())

    def test_creating_a_user_does_not_create_a_contact(self):
        before = Contact.objects.count()
        form = UserCreationForm(data=self._creation_data())
        self.assertTrue(form.is_valid(), form.errors)
        form.save()
        self.assertEqual(Contact.objects.count(), before)

    def test_creating_a_user_can_select_an_existing_contact(self):
        form = UserCreationForm(data=self._creation_data(contact=str(self.contact.pk)))
        self.assertTrue(form.is_valid(), form.errors)
        user = form.save()

        self.contact.refresh_from_db()
        self.assertEqual(self.contact.user, user)

    def test_change_form_shows_and_updates_the_current_contact(self):
        user = User.objects.create_user(
            email="ana@example.com", password="pw-Str0ng!42"
        )
        self.contact.user = user
        self.contact.save()

        form = UserChangeForm(instance=user)
        self.assertEqual(form.initial["contact"], self.contact)

        other = Contact.objects.create(name="Otra persona")
        form = UserChangeForm(
            instance=user,
            data={
                "email": user.email,
                "password": user.password,
                "contact": str(other.pk),
                "date_joined": user.date_joined,
            },
        )
        self.assertTrue(form.is_valid(), form.errors)
        form.save()

        self.contact.refresh_from_db()
        other.refresh_from_db()
        # The previous link is released, not deleted.
        self.assertIsNone(self.contact.user)
        self.assertEqual(other.user, user)

    def test_clearing_the_selector_unlinks_without_deleting(self):
        user = User.objects.create_user(
            email="ana@example.com", password="pw-Str0ng!42"
        )
        self.contact.user = user
        self.contact.save()

        form = UserChangeForm(
            instance=user,
            data={
                "email": user.email,
                "password": user.password,
                "contact": "",
                "date_joined": user.date_joined,
            },
        )
        self.assertTrue(form.is_valid(), form.errors)
        form.save()

        self.contact.refresh_from_db()
        self.assertIsNone(self.contact.user)
        self.assertTrue(Contact.objects.filter(pk=self.contact.pk).exists())

    def test_selector_hides_contacts_already_taken_by_another_user(self):
        taken_by = User.objects.create_user(
            email="otra@example.com", password="pw-Str0ng!42"
        )
        taken = Contact.objects.create(name="Ya asignada", user=taken_by)

        form = UserCreationForm()
        available = list(form.fields["contact"].queryset)
        self.assertIn(self.contact, available)
        self.assertNotIn(taken, available)

    def test_selector_keeps_the_users_own_contact_available(self):
        user = User.objects.create_user(
            email="ana@example.com", password="pw-Str0ng!42"
        )
        self.contact.user = user
        self.contact.save()

        form = UserChangeForm(instance=user)
        self.assertIn(self.contact, list(form.fields["contact"].queryset))

    def test_existing_user_without_a_contact_saves_normally(self):
        user = User.objects.create_user(
            email="vieja@example.com", password="pw-Str0ng!42"
        )

        form = UserChangeForm(
            instance=user,
            data={
                "email": "renombrada@example.com",
                "password": user.password,
                "contact": "",
                "date_joined": user.date_joined,
            },
        )
        self.assertTrue(form.is_valid(), form.errors)
        form.save()

        user.refresh_from_db()
        self.assertEqual(user.email, "renombrada@example.com")


class ContactAdminTests(TestCase):
    def setUp(self):
        self.superuser = User.objects.create_superuser(
            email="admin@example.com", password="pw-Str0ng!42"
        )
        self.client.force_login(self.superuser)
        self.contact = Contact.objects.create(
            name="Ana Benítez",
            description="Coordinadora de salud ambiental",
            institution="Ministerio de Salud",
            phone="+595 981 000000",
        )

    def test_changelist_lists_the_required_fields(self):
        response = self.client.get(reverse("admin:api_contact_changelist"))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Ana Benítez")
        self.assertContains(response, "Ministerio de Salud")
        self.assertContains(response, "+595 981 000000")
        self.assertContains(response, "Coordinadora de salud ambiental")

    def test_admin_can_add_a_contact_without_a_user(self):
        response = self.client.post(
            reverse("admin:api_contact_add"),
            {
                "name": "Carlos Duarte",
                "description": "Referente barrial",
                "institution": "Comisión vecinal",
                "phone": "+595 971 111111",
                "user": "",
            },
        )
        self.assertEqual(response.status_code, 302)
        created = Contact.objects.get(name="Carlos Duarte")
        self.assertIsNone(created.user)

    def test_admin_can_edit_and_delete_a_contact(self):
        change_url = reverse("admin:api_contact_change", args=[self.contact.pk])
        response = self.client.post(
            change_url,
            {
                "name": "Ana Benítez",
                "description": "Coordinadora nacional",
                "institution": "Ministerio de Salud",
                "phone": "+595 981 222222",
                "user": "",
            },
        )
        self.assertEqual(response.status_code, 302)
        self.contact.refresh_from_db()
        self.assertEqual(self.contact.description, "Coordinadora nacional")

        response = self.client.post(
            reverse("admin:api_contact_delete", args=[self.contact.pk]),
            {"post": "yes"},
        )
        self.assertEqual(response.status_code, 302)
        self.assertFalse(Contact.objects.filter(pk=self.contact.pk).exists())

    def test_user_add_page_offers_the_contact_selector(self):
        response = self.client.get(reverse("admin:accounts_user_add"))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'name="contact"')
