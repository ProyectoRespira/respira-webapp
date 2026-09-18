from django import forms
from django.contrib.auth import password_validation
from django.contrib.auth.forms import ReadOnlyPasswordHashField

from .models import User


class ContactSelectionMixin(forms.ModelForm):
    """Adds the optional ``contact`` selector to the admin user forms.

    The relation is declared on ``api.Contact`` (a nullable ``OneToOneField``
    to the user), so it is not a field of ``User`` and Django does not render
    it on the user form by itself. This mixin adds it as a plain form field
    that *selects an existing* contact — deliberately not an inline, which
    would offer to create one and make "do not automatically create a Contact
    when creating a User" easy to violate by accident.

    ``contact`` is declared at class level, not injected in ``__init__``:
    ``ModelAdmin.get_form`` validates every name in ``fieldsets`` against the
    form class's declared fields plus the model's, and rejects an unknown one
    before any instance exists. Only the queryset is narrowed per instance,
    in ``_init_contact_field``.

    Blank means "no contact": on save, that clears the link without ever
    deleting the contact, which keeps existing users (all of whom have none)
    working untouched. The queryset is restricted to contacts that are free or
    already this user's, so the one-to-one can't be handed to a second account
    through this form.
    """

    contact_field_name = "contact"

    contact = forms.ModelChoiceField(
        # Narrowed per instance in _init_contact_field; the class-level
        # queryset only has to exist for field validation at import time.
        queryset=None,
        required=False,
        label="Contact",
        help_text=(
            "Optional. Associate this user with an existing contact from the "
            "Contacts list. Contacts are never created here, and clearing "
            "this only unlinks the contact."
        ),
    )

    def _init_contact_field(self):
        from api.models import Contact

        instance = getattr(self, "instance", None)
        available = Contact.objects.filter(user__isnull=True)
        if instance is not None and instance.pk:
            available = available | Contact.objects.filter(user=instance)
            existing = Contact.objects.filter(user=instance).first()
            self.initial.setdefault(self.contact_field_name, existing)

        self.fields[self.contact_field_name].queryset = available.distinct()

    def _save_contact(self, user):
        """Point the selected contact at ``user`` and release the previous one."""
        from api.models import Contact

        selected = self.cleaned_data.get(self.contact_field_name)
        previous = Contact.objects.filter(user=user).exclude(
            pk=selected.pk if selected else None
        )
        # Unlink first: the OneToOne's unique index would reject the new link
        # while the old row still points at this user.
        previous.update(user=None)
        if selected is not None and selected.user_id != user.pk:
            selected.user = user
            selected.save(update_fields=["user", "updated_at"])


class UserCreationForm(ContactSelectionMixin):
    """Admin form to create users, keyed on email instead of username."""

    password1 = forms.CharField(
        label="Password", widget=forms.PasswordInput, strip=False
    )
    password2 = forms.CharField(
        label="Password confirmation",
        widget=forms.PasswordInput,
        strip=False,
        help_text="Enter the same password as before, for verification.",
    )

    class Meta:
        model = User
        fields = ("email",)

    def __init__(self, *args, **kwargs) -> None:
        super().__init__(*args, **kwargs)
        self._init_contact_field()

    def clean_password2(self) -> str:
        password1 = self.cleaned_data.get("password1")
        password2 = self.cleaned_data.get("password2")
        if password1 and password2 and password1 != password2:
            raise forms.ValidationError("The two password fields didn't match.")
        return password2

    def _post_clean(self) -> None:
        super()._post_clean()
        password = self.cleaned_data.get("password2")
        if password:
            try:
                password_validation.validate_password(password, self.instance)
            except forms.ValidationError as error:
                self.add_error("password2", error)

    def save(self, commit: bool = True) -> User:
        user = super().save(commit=False)
        user.set_password(self.cleaned_data["password1"])
        if commit:
            user.save()
            self._save_contact(user)
        return user


class UserChangeForm(ContactSelectionMixin):
    """Admin form to edit users; shows the hashed password read-only."""

    password = ReadOnlyPasswordHashField(
        label="Password",
        help_text=(
            "Raw passwords are not stored, so there is no way to see this "
            "user's password, but you can change it using "
            '<a href="../password/">this form</a>.'
        ),
    )

    class Meta:
        model = User
        fields = "__all__"

    def __init__(self, *args, **kwargs) -> None:
        super().__init__(*args, **kwargs)
        self._init_contact_field()

    def save(self, commit: bool = True) -> User:
        user = super().save(commit=commit)
        if commit:
            self._save_contact(user)
        else:
            # ModelForm defers m2m writes to save_m2m() when commit=False;
            # the contact link rides along so the admin's own flow saves it.
            original_save_m2m = self.save_m2m

            def save_m2m():
                original_save_m2m()
                self._save_contact(user)

            self.save_m2m = save_m2m
        return user
