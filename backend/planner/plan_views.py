"""Plan generation, viewing, diff and session override endpoints."""

from __future__ import annotations

from datetime import date

from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from courses.permissions import get_student

from .models import StudyPlan
from .permissions import HasStudentProfile
from .serializers import (
    GeneratePlanInputSerializer,
    PlannedSessionSerializer,
    SessionMoveInputSerializer,
    StudyPlanSerializer,
)
from .services import plan_service, replan_service, report_service


class PlanGenerateView(APIView):
    permission_classes = [IsAuthenticated, HasStudentProfile]

    def post(self, request):
        student = get_student(request.user)
        serializer = GeneratePlanInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        result = plan_service.generate_plan_for_student(
            student,
            (data["window_start"], data["window_end"]),
            data["trigger"],
            now=timezone.now(),
        )
        http_status = status.HTTP_201_CREATED if result.created else status.HTTP_200_OK
        return Response(
            {
                "plan": StudyPlanSerializer(result.plan).data,
                "created": result.created,
                "diff": {
                    "added": result.added,
                    "removed": result.removed,
                    "moved": result.moved,
                },
            },
            status=http_status,
        )


class PlanCurrentView(APIView):
    permission_classes = [IsAuthenticated, HasStudentProfile]

    def get(self, request):
        student = get_student(request.user)
        plan = StudyPlan.objects.filter(student=student).order_by("-version").first()
        if plan is None:
            return Response({"plan": None, "sessions": []})
        sessions = plan.sessions.filter(student=student)
        date_from = request.query_params.get("from")
        date_to = request.query_params.get("to")
        if date_from:
            sessions = sessions.filter(end_dt__gte=date_from)
        if date_to:
            sessions = sessions.filter(start_dt__lte=date_to)
        return Response(
            {
                "plan": StudyPlanSerializer(plan).data,
                "sessions": PlannedSessionSerializer(sessions, many=True).data,
            }
        )

    def delete(self, request):
        """Discard the student's current plan (sessions cascade) for a fresh start."""
        student = get_student(request.user)
        StudyPlan.objects.filter(student=student).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class PlanDiffView(APIView):
    permission_classes = [IsAuthenticated, HasStudentProfile]

    def get(self, request, pk):
        student = get_student(request.user)
        plan = get_object_or_404(StudyPlan, student=student, uuid=pk)
        return Response(plan_service.plan_diff(plan))


class SessionDetailView(APIView):
    permission_classes = [IsAuthenticated, HasStudentProfile]

    def patch(self, request, pk):
        student = get_student(request.user)
        serializer = SessionMoveInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        try:
            if "start_dt" not in data and "end_dt" not in data:
                session = plan_service.set_lock(student, pk, data.get("is_locked", False))
            else:
                session = plan_service.move_session(
                    student,
                    pk,
                    start_dt=data.get("start_dt"),
                    end_dt=data.get("end_dt"),
                    is_locked=data.get("is_locked"),
                )
        except plan_service.SessionMoveError as exc:
            raise ValidationError({exc.field: [exc.message], "reason": [exc.code]}) from exc
        return Response(PlannedSessionSerializer(session).data)

    def delete(self, request, pk):
        student = get_student(request.user)
        try:
            plan_service.delete_session(student, pk, reason=request.data.get("reason", ""))
        except plan_service.SessionMoveError as exc:
            raise ValidationError({exc.field: [exc.message], "reason": [exc.code]}) from exc
        return Response(status=status.HTTP_204_NO_CONTENT)


class SessionSkipView(APIView):
    permission_classes = [IsAuthenticated, HasStudentProfile]

    def post(self, request, pk):
        student = get_student(request.user)
        try:
            session = plan_service.skip_session(student, pk)
        except plan_service.SessionMoveError as exc:
            raise ValidationError({exc.field: [exc.message], "reason": [exc.code]}) from exc
        return Response(PlannedSessionSerializer(session).data)


class WeeklyReportView(APIView):
    permission_classes = [IsAuthenticated, HasStudentProfile]

    def get(self, request):
        student = get_student(request.user)
        date_from = request.query_params.get("from")
        date_to = request.query_params.get("to")
        if date_from and date_to:
            start = date.fromisoformat(date_from)
            end = date.fromisoformat(date_to)
        else:
            start, end = replan_service.default_window()
        return Response(report_service.weekly_report(student, start, end))
