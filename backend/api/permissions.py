from rest_framework.permissions import BasePermission

from .models import UserRole


class IsAdminRole(BasePermission):
    """Allow access only to authenticated users with an admin or superadmin role."""

    message = "You do not have permission to manage platform users."

    def has_permission(self, request, view):
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and getattr(user, "role", None)
            in {UserRole.ADMIN, UserRole.SUPERADMIN}
        )
