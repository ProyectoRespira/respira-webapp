from django import forms
from django.contrib.auth.forms import (
    AdminPasswordChangeForm as BaseAdminPasswordChangeForm,
)
from django.contrib.auth.forms import (
    ReadOnlyPasswordHashField,
    SetPasswordMixin,
    SetUnusablePasswordMixin,
)

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


class UserCreationForm(
    SetUnusablePasswordMixin, SetPasswordMixin, ContactSelectionMixin
):
    """Admin form to create users, keyed on email instead of username.

    Two kinds of account come out of it. Staff get a password typed here, as
    before. An institution's dashboard user gets none: the operator disables
    password-based authentication, picks the institution (and the role inside
    it), and the admin emails the invitation on save (see
    ``accounts.admin.UserAdmin.save_related``) — the person chooses their own
    password from that link, so nobody else ever knows it.

    ``username`` is left empty in both cases: accounts sign in by email
    (``USERNAME_FIELD``) and the column is only kept for compatibility.

    The dashboard fields are declared here but the admin removes them for an
    operator who may not create ``InstitutionUser`` links, so every method
    below treats them as optional.
    """

    usable_password = SetUnusablePasswordMixin.create_usable_password_field(
        help_text=(
            "Disable it for an institution's dashboard user: pick the "
            "institution below and they are emailed an invitation to choose "
            "their own password. Keep it enabled to set a password now, as "
            "for a staff account."
        )
    )
    password1, password2 = SetPasswordMixin.create_password_fields()

    dashboard_institution = forms.ModelChoiceField(
        # Set in __init__, like `contact`: the class-level queryset only has to
        # exist for field validation at import time.
        queryset=None,
        required=False,
        label="Institution",
        help_text="Optional. Gives the user access to this institution's dashboard.",
    )
    # Replaced in __init__ by ``InstitutionUser.role``'s own form field, so
    # the choices and the default stay the model's.
    dashboard_role = forms.ChoiceField(required=False, label="Role")

    dashboard_field_names = ("dashboard_institution", "dashboard_role")

    class Meta:
        model = User
        fields = ("email", "first_name", "last_name")

    def __init__(self, *args, **kwargs) -> None:
        super().__init__(*args, **kwargs)
        self._init_contact_field()
        # Optional at field level, like Django's own AdminUserCreationForm:
        # `validate_passwords` requires them only when the password is usable.
        self.fields["password1"].required = False
        self.fields["password2"].required = False
        self._init_dashboard_fields()

    def _init_dashboard_fields(self) -> None:
        from api.models import Institution, InstitutionUser

        institution_field = self.fields.get("dashboard_institution")
        if institution_field is not None:
            institution_field.queryset = Institution.objects.order_by("legal_name")
        if "dashboard_role" in self.fields:
            self.fields["dashboard_role"] = InstitutionUser._meta.get_field(
                "role"
            ).formfield(
                required=False,
                label="Role",
                help_text=(
                    "Inside the institution: admins can also write to the "
                    "panel, members only read it."
                ),
            )

    def clean(self):
        self.validate_passwords()
        cleaned_data = super().clean()
        if (
            not cleaned_data.get("set_usable_password", True)
            and cleaned_data.get("dashboard_institution") is None
            and "usable_password" not in self.errors
        ):
            # The invitation is the only way into an account without a
            # password, and it goes only to someone linked to an institution.
            # Without one this would create an account nobody can sign in to.
            self.add_error(
                "usable_password",
                "A user without a password can only get in through the "
                "dashboard invitation, which needs an institution. Pick one, "
                "or enable password-based authentication and set a password.",
            )
        return cleaned_data

    def _post_clean(self) -> None:
        super()._post_clean()
        # After super(), so the validators see the email just typed (the
        # similarity check compares the password against it).
        self.validate_password_for_user(self.instance)

    @property
    def sends_invitation(self) -> bool:
        """Whether saving this form should be followed by the invitation."""
        return (
            not self.cleaned_data.get("set_usable_password", True)
            and self.cleaned_data.get("dashboard_institution") is not None
        )

    def save(self, commit: bool = True) -> User:
        user = super().save(commit=False)
        user = self.set_password_and_save(user, commit=commit)
        if commit:
            self._save_links(user)
        else:
            # The admin saves with commit=False and only then calls save_m2m();
            # the links need the user's row, so they ride along with it, the
            # same way UserChangeForm handles the contact.
            original_save_m2m = self.save_m2m

            def save_m2m():
                original_save_m2m()
                self._save_links(user)

            self.save_m2m = save_m2m
        return user

    def _save_links(self, user) -> None:
        self._save_contact(user)
        self._save_dashboard_access(user)

    def _save_dashboard_access(self, user) -> None:
        from api.models import InstitutionUser

        institution = self.cleaned_data.get("dashboard_institution")
        if institution is None:
            return
        link = {"user": user, "institution": institution}
        role = self.cleaned_data.get("dashboard_role")
        if role:
            link["role"] = role
        InstitutionUser.objects.create(**link)


class AdminPasswordChangeForm(BaseAdminPasswordChangeForm):
    """Users → Change password, saying what "Disabled" does to dashboard access.

    Disabling the password of someone who has signed in before does keep them
    out: they have nothing to sign in with, password reset skips them, and
    ``api.invitations.awaits_first_password`` no longer counts them as an
    invitee. Of someone who never signed in it does not — to the dashboard
    they still look like an invitee who can ask for a create-password link.
    The operator is told which control revokes access in every case rather
    than having to know that distinction.
    """

    usable_password_help_text = (
        BaseAdminPasswordChangeForm.usable_password_help_text
        + (
            '<ul class="messagelist"><li class="info">'
            "To take away an institution user's dashboard access, uncheck "
            "“Active” on the user or remove their institution link instead: "
            "someone without a password who has never signed in can still ask "
            "for an invitation to create one.</li></ul>"
        )
    )


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
