from rest_framework import permissions

from .access import is_course_accessible


def get_teacher(user):
    return getattr(user, "teacher", None)


def get_student(user):
    return getattr(user, "student", None)


class IsTeacher(permissions.BasePermission):
    """Only authenticated teachers may pass."""

    message = "Only teachers can perform this action."

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and get_teacher(request.user)
        )


class OwnsCourseObjectPermission(permissions.BasePermission):
    """Read for subscribed students, write for the course owner teacher.

    A few POST actions are student interactions (lesson completion, survey
    submission) rather than authoring, so they are allowed for any student who
    can access the course.
    """

    message = "You do not have access to this course."

    STUDENT_WRITE_ACTIONS = {
        "mark_as_finished",
        "mark_as_unfinished",
        "save_position",
        "submit",
        "start",
    }

    def _is_student_write_action(self, view):
        return getattr(view, "action", None) in self.STUDENT_WRITE_ACTIONS

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.method in permissions.SAFE_METHODS:
            return True
        if self._is_student_write_action(view):
            return True
        return bool(get_teacher(request.user))

    def has_object_permission(self, request, view, obj):
        course = getattr(obj, "course", obj)
        teacher = get_teacher(request.user)
        if teacher and course.teacher_id == teacher.id:
            return True

        if request.method in permissions.SAFE_METHODS or self._is_student_write_action(
            view
        ):
            student = get_student(request.user)
            return bool(student and is_course_accessible(student, course))

        return False
