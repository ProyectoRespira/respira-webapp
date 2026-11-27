import logging

from django.contrib import admin, messages
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .forms import AdminPasswordChangeForm, UserChangeForm, UserCreationForm
from .models import Role, User

logger = logging.getLogger(__name__)

# Django Admin branding (shown on login, header and index pages).
admin.site.site_header = "Proyecto Respira — Administration"
admin.site.site_title = "Proyecto Respira Admin"
admin.site.index_title = "Station Administration"


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    form = UserChangeForm
    add_form = UserCreationForm
    change_password_form = AdminPasswordChangeForm

    list_display = ("email", "role", "is_staff", "is_active")
    list_filter = ("is_staff", "is_superuser", "is_active", "role")
    search_fields = ("email", "username")
    ordering = ("email",)

    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Personal info", {"fields": ("first_name", "last_name", "username")}),
        ("Contact", {"fields": ("contact",)}),
        ("Role", {"fields": ("role",)}),
        (
            "Permissions",
            {
                "fields": (
                    "is_active",
                    "is_staff",
                    "is_superuser",
                    "groups",
                    "user_permissions",
                ),
            },
        ),
        ("Important dates", {"fields": ("last_login", "date_joined")}),
    )
    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": (
                    "email",
                    "first_name",
                    "last_name",
                    "usable_password",
                    "password1",
                    "password2",
                ),
            },
        ),
        (
            "Contact",
            {
                "classes": ("wide",),
                "fields": ("contact",),
                "description": (
                    "Optional. Pick an existing contact to associate with this "
                    "user; leave blank to create the user without one."
                ),
            },
        ),
    )

    # Granting dashboard access is creating an `InstitutionUser` link, so it
    # takes that model's permission on top of the user ones the add view
    # already requires — the same rule as the inline on the Institution page.
    dashboard_access_permission = "api.add_institutionuser"

    def _can_grant_dashboard_access(self, request) -> bool:
        return request.user.has_perm(self.dashboard_access_permission)

    def get_fieldsets(self, request, obj=None):
        if obj is not None or not self._can_grant_dashboard_access(request):
            return super().get_fieldsets(request, obj)
        return (
            *self.add_fieldsets,
            (
                "Dashboard access",
                {
                    "classes": ("wide",),
                    "fields": self.add_form.dashboard_field_names,
                    "description": (
                        "Optional. For a client's dashboard user, pick the "
                        "institution and disable password-based "
                        "authentication above: on save they are emailed an "
                        "invitation to choose their own password."
                    ),
                },
            ),
        )

    def get_form(self, request, obj=None, **kwargs):
        form = super().get_form(request, obj, **kwargs)
        if obj is None and not self._can_grant_dashboard_access(request):
            # Declared fields survive `fields=`, so leaving them out of the
            # fieldsets only hides them: a hand-written POST could still fill
            # them in. Dropping them from this generated class (a fresh one
            # per call) is what actually withholds them.
            for name in self.add_form.dashboard_field_names:
                form.base_fields.pop(name, None)
        return form

    def save_related(self, request, form, formsets, change):
        # The links (contact, institution) are written by `save_related`
        # itself, through the form's save_m2m, so the invitation can only go
        # out after it: it is addressed to a user already linked.
        super().save_related(request, form, formsets, change)
        if not change and getattr(form, "sends_invitation", False):
            self._send_invitation(request, form.instance)

    def _send_invitation(self, request, user) -> None:
        from api.invitations import send_institution_invitation

        institution = user.institution_user.institution
        try:
            send_institution_invitation(user, institution, request=request)
        except Exception as error:
            # The account stays: it is valid, only the email is missing, and
            # it can be sent again without re-creating anything.
            logger.exception("Failed to send the dashboard invitation email")
            self.message_user(
                request,
                f"The user was created, but the invitation to {user.email} "
                f"could not be sent: {error}. Send it again with “Send "
                "dashboard invitation” on the Institutions list, or ask them "
                "to use “¿Sos nuevo en la plataforma?” on the login page.",
                level=messages.ERROR,
            )
        else:
            self.message_user(
                request,
                f"Invitation sent to {user.email} to access the {institution} "
                "dashboard. They will choose their own password from the link.",
                level=messages.SUCCESS,
            )


@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "description")
    search_fields = ("name", "slug")
    prepopulated_fields = {"slug": ("name",)}
    ordering = ("name",)
