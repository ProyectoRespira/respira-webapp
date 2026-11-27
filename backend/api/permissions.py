from rest_framework.permissions import SAFE_METHODS, BasePermission

from .models import (
    Institution,
    InstitutionRole,
    UserRole,
    get_institution_for_user,
    get_institution_role,
    user_role,
)


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


class IsInstitutionAdmin(BasePermission):
    """Allow writes only to an institution's admins; members may still read.

    Layered on top of ``IsInstitutionUser`` (which decides whether the caller
    reaches the panel at all): safe methods pass for every institution user,
    and only an unsafe one asks for ``InstitutionRole.ADMIN``. That is what
    lets a view keep a single permission list for both its list and its create
    instead of splitting them per action.

    Not ``IsAdminRole``: that is the *platform* role gating the backoffice. A
    member of an institution is never an admin of it because of a platform
    role, nor the other way round.
    """

    message = "Only an administrator of your institution can make this change."

    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        return get_institution_role(request.user) == InstitutionRole.ADMIN


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
