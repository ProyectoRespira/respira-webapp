from rest_framework.permissions import BasePermission

from .models import Institution, UserRole, get_institution_for_user, user_role


class IsAdminRole(BasePermission):
    """Allow access only to authenticated users with an admin or superadmin role."""

    message = "You do not have permission to manage platform users."

    def has_permission(self, request, view):
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and user_role(user) in {UserRole.ADMIN, UserRole.SUPERADMIN}
        )


class IsInstitutionUser(BasePermission):
    """Allow access only to authenticated users linked to an Institution.

    Distinct from ``IsAdminRole``: this gates the institutional dashboard, not
    the backoffice, so it checks ``InstitutionUser`` rather than
    ``UserProfile``/``accounts.Role``.
    """

    message = "You do not have access to the institutional dashboard."

    def has_permission(self, request, view):
        return get_institution_for_user(request.user) is not None


class IsOwnInstitution(BasePermission):
    """Object-level check: the target's institution must match the caller's.

    Applies to any object that either *is* an ``Institution`` or exposes one
    via an ``institution`` attribute (e.g. ``InstitutionContract``). Denies
    (403) rather than filtering, so it also protects views whose queryset
    isn't already scoped to the caller's own institution.
    """

    message = "You do not have access to another institution's data."

    def has_object_permission(self, request, view, obj):
        institution = get_institution_for_user(request.user)
        if institution is None:
            return False
        target = (
            obj if isinstance(obj, Institution) else getattr(obj, "institution", None)
        )
        return target is not None and target.id == institution.id
