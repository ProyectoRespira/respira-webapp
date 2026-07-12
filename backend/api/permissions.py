from rest_framework.permissions import BasePermission

from .models import UserRole, user_role


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
