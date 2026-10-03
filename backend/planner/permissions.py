from rest_framework import permissions

from courses.permissions import get_student


class HasStudentProfile(permissions.BasePermission):
    """Allow only authenticated users that have a ``users.Student`` profile."""

    message = "Only students with a planner profile can use this endpoint."

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and get_student(request.user)
        )
