from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from core.views import UUIDLookupMixin
from groups.models import Group
from groups.serializers import GroupSerializer
from languagesteaching.models import StudentLanguageProficiency
from subscription.models import Subscription
from users.models import Student, Teacher
from users.serializers import StudentSerializer


def _param(request, *names):
    """Return the first non-empty query parameter among the given aliases."""
    for name in names:
        value = request.query_params.get(name)
        if value not in (None, ""):
            return value
    return None


class GroupViewSet(UUIDLookupMixin, viewsets.ModelViewSet):
    """Groups API.

    ``GET /groups/`` is a catalogue of open groups and accepts optional,
    composable filters (all by public uuid, except the school level name)::

        ?school_level=ثانوي&grade=<uuid>&field_of_study=<uuid>
        &language_name=<name>&teacher_id=<uuid>

    Personal listings live on dedicated actions (``teacher_groups``,
    ``student_groups``) so the catalogue is never silently scoped by role.
    """

    serializer_class = GroupSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = (
            Group.objects.select_related(
                "admin__user",
                "school_level",
                "grade",
                "field_of_study",
                "language",
                "language_level",
            )
            .prefetch_related("students__user")
            .all()
        )

        # --- optional filters (legacy camelCase names are still accepted) ---
        school_level = _param(self.request, "school_level", "school_Level")
        grade_id = _param(self.request, "grade")
        field_id = _param(self.request, "field_of_study", "field")
        language_name = _param(self.request, "language_name", "language", "lang")
        teacher_id = _param(self.request, "teacher_id", "teacher")
        group_status = _param(self.request, "status")
        mine = _param(self.request, "mine")

        if school_level:
            queryset = queryset.filter(school_level__name=school_level)
        if grade_id:
            queryset = queryset.filter(grade__uuid=grade_id)
        if field_id:
            queryset = queryset.filter(field_of_study__uuid=field_id)
        if language_name:
            queryset = queryset.filter(
                group_type=Group.GroupType.LANGUAGE,
                language__name__icontains=language_name,
            )
        if teacher_id:
            queryset = queryset.filter(admin__uuid=teacher_id)

        owner_context = bool(teacher_id) or mine in ("1", "true", "True")
        if group_status:
            queryset = queryset.filter(status=group_status)
        elif self.action == "list" and not owner_context:
            # Browsing the catalogue only shows groups accepting new students.
            queryset = queryset.filter(status="open")

        if mine in ("1", "true", "True"):
            user = self.request.user
            if user.role == "teacher":
                queryset = queryset.filter(admin__user=user)
            elif user.role == "student":
                queryset = queryset.filter(students__user=user)

        return queryset.distinct()

    # ------------------------------------------------------------------ #
    # Helpers
    # ------------------------------------------------------------------ #
    def _current_teacher(self):
        try:
            return self.request.user.teacher
        except Teacher.DoesNotExist:
            return None

    # ------------------------------------------------------------------ #
    # Personal listings
    # ------------------------------------------------------------------ #
    @action(detail=False, methods=["get"])
    def teacher_groups(self, request):
        teacher = self._current_teacher()
        if teacher is None:
            return Response(
                {"detail": "The authenticated user is not a teacher."},
                status=status.HTTP_403_FORBIDDEN,
            )

        groups = self.get_queryset().filter(admin=teacher)
        return Response(self.get_serializer(groups, many=True).data)

    @action(detail=False, methods=["get"])
    def student_groups(self, request):
        user = request.user
        if user.role != "student":
            return Response(
                {"detail": "The authenticated user is not a student."},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            student = user.student
        except Student.DoesNotExist:
            return Response(
                {"detail": "Student profile not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        groups = self.get_queryset().filter(students=student)
        return Response(self.get_serializer(groups, many=True).data)

    @action(detail=False, methods=["get"], permission_classes=[IsAuthenticated])
    def profile_groups(self, request):
        """Public groups of a teacher, optionally narrowed to the viewer's grade."""
        teacher_id = _param(request, "teacher_id", "teacher")
        if not teacher_id:
            return Response(
                {"detail": "teacher_id is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        teacher = get_object_or_404(Teacher, uuid=teacher_id)
        groups = self.get_queryset().filter(admin=teacher)

        user = request.user
        if getattr(user, "role", None) == "student":
            student = Student.objects.filter(user=user).first()
            if student and student.grade_id:
                groups = groups.filter(
                    Q(grade=student.grade) | Q(grade__isnull=True)
                )
                if student.field_of_study_id:
                    groups = groups.filter(
                        Q(field_of_study=student.field_of_study)
                        | Q(field_of_study__isnull=True)
                    )

        return Response(self.get_serializer(groups, many=True).data)

    @action(detail=False, methods=["get"], permission_classes=[IsAuthenticated])
    def Noroup_students(self, request):
        return self._available_students()

    @action(detail=False, methods=["get"], permission_classes=[IsAuthenticated])
    def available_students(self, request):
        return self._available_students()

    def _available_students(self):
        """Students the teacher can still add to the given group."""
        user = self.request.user
        group_id = _param(self.request, "group_id")
        if not group_id:
            return Response(
                {"detail": "group_id parameter is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        group = get_object_or_404(Group, uuid=group_id)
        teacher = self._current_teacher()
        if teacher is None:
            return Response(
                {"detail": "The authenticated user is not a teacher."},
                status=status.HTTP_403_FORBIDDEN,
            )
        if group.admin != teacher:
            return Response(
                {"detail": "You are not the admin of this group."},
                status=status.HTTP_403_FORBIDDEN,
            )

        subscriptions = Subscription.objects.filter(teacher=teacher, is_active=True)
        subscriptions = subscriptions.exclude(student__groups__isnull=False)

        if group.group_type == Group.GroupType.ACADEMIC:
            if group.grade_id:
                subscriptions = subscriptions.filter(student__grade=group.grade)
            if group.field_of_study_id:
                subscriptions = subscriptions.filter(
                    student__field_of_study=group.field_of_study
                )
        elif group.group_type == Group.GroupType.LANGUAGE:
            matching_students = StudentLanguageProficiency.objects.filter(
                language=group.language, level=group.language_level
            ).values_list("student_id", flat=True)
            subscriptions = subscriptions.filter(student_id__in=matching_students)

        students = [subscription.student for subscription in subscriptions]
        return Response(StudentSerializer(students, many=True).data)

    # ------------------------------------------------------------------ #
    # Mutations
    # ------------------------------------------------------------------ #
    def destroy(self, request, pk=None):
        group = self.get_object()
        teacher = self._current_teacher()
        if teacher is None or group.admin != teacher:
            return Response(
                {"detail": "You do not have permission to delete this group."},
                status=status.HTTP_403_FORBIDDEN,
            )
        group.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["post"])
    def add_student_to_group(self, request, pk=None):
        group = self.get_object()
        teacher = self._current_teacher()
        if teacher is None or group.admin != teacher:
            return Response(
                {"detail": "You do not have permission to modify this group."},
                status=status.HTTP_403_FORBIDDEN,
            )

        student_id = request.data.get("student_id")
        if not student_id:
            raise ValidationError({"student_id": "This field is required."})

        student = get_object_or_404(Student, uuid=student_id)
        group.students.add(student)
        return Response({"detail": "Student added to group successfully."})

    @action(detail=True, methods=["delete"])
    def remove_student(self, request, pk=None):
        group = self.get_object()
        teacher = self._current_teacher()
        if teacher is None or group.admin != teacher:
            return Response(
                {"detail": "You do not have permission to modify this group."},
                status=status.HTTP_403_FORBIDDEN,
            )

        student_id = request.data.get("student_id")
        if not student_id:
            raise ValidationError({"student_id": "This field is required."})

        student = group.students.filter(uuid=student_id).first()
        if student is None:
            return Response(
                {"detail": "Student not found in this group."},
                status=status.HTTP_404_NOT_FOUND,
            )
        group.students.remove(student)
        return Response(status=status.HTTP_204_NO_CONTENT)
