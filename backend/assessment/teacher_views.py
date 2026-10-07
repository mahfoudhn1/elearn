"""Teacher- and reviewer-facing analysis endpoints (Phase A9/A10).

* Class analytics (A9): scoped to the teacher's own groups/subscriptions.
* Item analysis (A10): surfaced to reviewers (staff) and the question's author.
* Teacher grades (A10): a teacher records grades for their own students.
* Calibration report (A10): staff-only readiness-vs-grades correlation.
"""

from __future__ import annotations

from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError
from rest_framework.permissions import IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from django.utils import timezone

from courses.permissions import IsTeacher, get_teacher
from groups.models import Group

from . import analytics, calibration, item_analysis
from .models import Question, Quiz, TeacherGrade
from .serializers import TeacherGradeSerializer


class TeacherClassesView(APIView):
    """The teacher's own groups, with a student count each."""

    permission_classes = [IsAuthenticated, IsTeacher]

    def get(self, request):
        teacher = get_teacher(request.user)
        groups = analytics.teacher_groups(teacher)
        payload = [
            {
                "id": str(group.uuid),
                "name": group.name,
                "group_type": group.group_type,
                "student_count": group.students.count(),
            }
            for group in groups
        ]
        return Response(payload)


class TeacherOverviewAnalyticsView(APIView):
    """Analytics across every student the teacher is responsible for."""

    permission_classes = [IsAuthenticated, IsTeacher]

    def get(self, request):
        teacher = get_teacher(request.user)
        students = analytics.teacher_students(teacher)
        return Response(analytics.class_analytics(students))


class TeacherClassAnalyticsView(APIView):
    """Analytics for one of the teacher's groups. 404 for any other group."""

    permission_classes = [IsAuthenticated, IsTeacher]

    def get(self, request, group_id):
        teacher = get_teacher(request.user)
        group = Group.objects.filter(uuid=group_id, admin=teacher).first()
        if group is None:
            # Never reveal that another teacher's group exists.
            raise NotFound("Group not found.")
        students = analytics.group_students(teacher, group)
        payload = analytics.class_analytics(students)
        payload["group"] = {
            "id": str(group.uuid),
            "name": group.name,
            "group_type": group.group_type,
        }
        return Response(payload)


class ItemAnalysisView(APIView):
    """Item analysis for one question, or every question of a quiz.

    Visible to staff reviewers and to the question's author. Not a public
    surface: item statistics must never leak to students.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        teacher = get_teacher(request.user)
        question_ref = request.query_params.get("question")
        quiz_ref = request.query_params.get("quiz")

        if question_ref:
            question = (
                Question.objects.filter(uuid=question_ref).select_related("topic").first()
            )
            if question is None:
                raise NotFound("Question not found.")
            self._ensure_visible(request, teacher, question)
            questions = [question]
        elif quiz_ref:
            quiz = Quiz.objects.filter(uuid=quiz_ref).first()
            if quiz is None:
                raise NotFound("Quiz not found.")
            if not request.user.is_staff and (
                teacher is None or quiz.author_id != teacher.id
            ):
                raise PermissionDenied("You can only analyse your own quizzes.")
            questions = list(
                Question.objects.filter(attempt_answers__attempt__quiz=quiz).distinct()
            )
        else:
            raise ValidationError(
                {"detail": "Provide a 'question' or 'quiz' query parameter."}
            )

        return Response(
            [
                {"question": str(question.uuid), **self._result(question)}
                for question in questions
            ]
        )

    @staticmethod
    def _ensure_visible(request, teacher, question):
        if request.user.is_staff:
            return
        if teacher is None or question.author_id != teacher.id:
            raise PermissionDenied("You can only analyse your own questions.")

    @staticmethod
    def _result(question):
        return item_analysis.result_to_dict(
            item_analysis.item_analysis_for_question(question)
        )


class TeacherGradeView(APIView):
    """Record or update a teacher grade for a student in the teacher's scope."""

    permission_classes = [IsAuthenticated, IsTeacher]

    def post(self, request):
        teacher = get_teacher(request.user)
        serializer = TeacherGradeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        student = serializer.validated_data["student"]
        if not analytics.teacher_students(teacher).filter(id=student.id).exists():
            raise PermissionDenied("This student is not in your classes.")
        grade, _created = TeacherGrade.objects.update_or_create(
            student=student,
            subject=serializer.validated_data["subject"],
            defaults={
                "score": serializer.validated_data["score"],
                "max_score": serializer.validated_data.get("max_score", 100.0),
                "recorded_by": teacher,
                "recorded_at": serializer.validated_data.get("recorded_at")
                or timezone.now(),
                "source_note": serializer.validated_data.get("source_note", ""),
            },
        )
        return Response(TeacherGradeSerializer(grade).data)


class CalibrationReportView(APIView):
    """Staff-only: readiness vs teacher grades, per subject with sample sizes."""

    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request):
        return Response(calibration.build_calibration_report())