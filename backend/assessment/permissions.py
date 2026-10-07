"""Permissions for assessment content.

Reuses ``courses.permissions`` helpers so "teacher" and "student" mean the same
thing across the project.

Roles in Phase A1:
* **author** -- a ``users.Teacher``; may create questions, edit/delete their own
  DRAFTs and submit them for review.
* **reviewer** -- a staff user (``User.is_staff``); may publish/reject/retire.
  A dedicated reviewer role is out of scope for A1 (documented in
  ``docs/assessment/A1.md``).
* **student** -- read-only; only ever sees PUBLISHED questions and never the
  correct flags.
"""

from rest_framework import permissions

from courses.permissions import get_student, get_teacher


def is_author(user, question) -> bool:
    teacher = get_teacher(user)
    return bool(teacher and question.author_id == teacher.id)


class IsTeacherOrStaff(permissions.BasePermission):
    """Write access for teachers (authors) and staff (reviewers)."""

    message = "Only teachers or reviewers can modify assessment content."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.method in permissions.SAFE_METHODS:
            return True
        return bool(get_teacher(request.user)) or request.user.is_staff


class QuestionPermission(permissions.BasePermission):
    """Read for any authenticated user; writes for the owning author or staff.

    Workflow actions (submit/publish/reject/retire) are enforced inside the view
    because they allow different actors at different transitions.
    """

    message = "You do not have access to this question."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.method in permissions.SAFE_METHODS:
            return True
        return bool(get_teacher(request.user)) or request.user.is_staff

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            if obj.status == obj.Status.PUBLISHED:
                return True
            # Unpublished content is author/reviewer only.
            return request.user.is_staff or is_author(request.user, obj)
        return request.user.is_staff or is_author(request.user, obj)


class IsReviewer(permissions.BasePermission):
    """Staff reviewers only."""

    message = "Only reviewers can perform this action."

    def has_permission(self, request, view):
        return bool(
            request.user and request.user.is_authenticated and request.user.is_staff
        )
