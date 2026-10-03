"""Staff-only planner tooling: diagnostics, dry-run, rule-set validation.

All endpoints require ``IsAdminUser``. The dry-run runs the engine and returns
``EngineOutput`` but never writes a plan/session.
"""

from __future__ import annotations

from datetime import date, datetime, time

from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from planner.adapters.base import student_timezone
from planner.engine import DayContext, compute_free_intervals, load_rules
from planner.pedagogy_schema import PedagogyRulesError, validate_pedagogy_rules
from planner.models import (
    AcademicPeriod,
    PedagogyRuleSet,
    PlannedSession,
    PlannerExam,
    StudentPlannerProfile,
)
from planner.services import plan_service, serialization
from users.models import Student

WEEKEND_WEEKDAYS = (4, 5)  # Friday, Saturday


def _parse_date(value: str, field: str) -> date:
    try:
        return date.fromisoformat(value)
    except (TypeError, ValueError) as exc:
        raise ValidationError({field: "Expected YYYY-MM-DD."}) from exc


def _student_from_request(request) -> Student:
    identifier = request.query_params.get("student") or request.data.get("student")
    if not identifier:
        raise ValidationError({"student": "A student uuid is required."})
    return get_object_or_404(Student, uuid=identifier)


class StaffDiagnosticsView(APIView):
    """Busy blocks, free intervals and plan sessions (with reasons) for one day."""

    permission_classes = [IsAdminUser]

    def get(self, request):
        student = _student_from_request(request)
        day = _parse_date(request.query_params.get("date", ""), "date")
        profile, _ = StudentPlannerProfile.objects.get_or_create(student=student)
        tz = student_timezone(student)

        wake_min = profile.wake_time.hour * 60 + profile.wake_time.minute if profile.wake_time else 360
        sleep_min = (
            profile.sleep_time.hour * 60 + profile.sleep_time.minute if profile.sleep_time else 1380
        )
        is_holiday = AcademicPeriod.objects.filter(
            suspends_school=True, start_date__lte=day, end_date__gte=day
        ).exists()
        is_exam_day = PlannerExam.objects.filter(student=student, exam_date=day).exists()
        day_context = DayContext(
            date=day,
            wake_min=wake_min,
            sleep_min=sleep_min,
            is_weekend=day.weekday() in WEEKEND_WEEKDAYS,
            is_holiday=is_holiday,
            is_exam_day=is_exam_day,
        )

        rules = load_rules()
        from planner.adapters import collect_busy_blocks

        busy = collect_busy_blocks(student, day, day)
        free = compute_free_intervals(day_context, busy, rules)

        sessions = []
        for session in PlannedSession.objects.filter(student=student).exclude(
            state=PlannedSession.State.CANCELLED
        ):
            local = session.start_dt.astimezone(tz)
            if local.date() != day:
                continue
            end_local = session.end_dt.astimezone(tz)
            sessions.append(
                {
                    "id": str(session.uuid),
                    "subject": session.subject,
                    "activity_type": session.activity_type,
                    "origin": session.origin,
                    "state": session.state,
                    "is_locked": session.is_locked,
                    "start_dt": session.start_dt.isoformat(),
                    "end_dt": session.end_dt.isoformat(),
                    "start_min": local.hour * 60 + local.minute,
                    "end_min": end_local.hour * 60 + end_local.minute,
                    "reasons": session.reasons,
                }
            )

        return Response(
            {
                "student_id": student.pk,
                "date": day.isoformat(),
                "day_context": {
                    "wake_min": wake_min,
                    "sleep_min": sleep_min,
                    "is_weekend": day_context.is_weekend,
                    "is_holiday": is_holiday,
                    "is_exam_day": is_exam_day,
                },
                "busy_blocks": serialization.serialize_busy_blocks(busy),
                "free_intervals": serialization.serialize_free_intervals(free),
                "sessions": sessions,
            }
        )


class StaffDryRunView(APIView):
    """Run the engine for a student/window and return EngineOutput. Saves nothing."""

    permission_classes = [IsAdminUser]

    def post(self, request):
        student = _student_from_request(request)
        window_start = _parse_date(request.data.get("window_start", ""), "window_start")
        window_end = _parse_date(request.data.get("window_end", ""), "window_end")
        if window_end < window_start:
            raise ValidationError({"window_end": "Must not be before window_start."})
        output, _ctx = plan_service.dry_run_plan(
            student, (window_start, window_end), timezone.now()
        )
        return Response(serialization.serialize_engine_output(output))


class StaffRuleSetValidateView(APIView):
    """Validate a pedagogy rule-set JSON without saving."""

    permission_classes = [IsAdminUser]

    def post(self, request):
        payload = request.data.get("json", request.data)
        try:
            validate_pedagogy_rules(payload)
        except PedagogyRulesError as exc:
            return Response({"valid": False, "error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response({"valid": True})


class StaffRuleSetListView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        rows = PedagogyRuleSet.objects.order_by("name", "-version")
        return Response(
            [
                {
                    "id": str(row.uuid),
                    "name": row.name,
                    "version": row.version,
                    "is_active": row.is_active,
                    "applies_to_level": row.applies_to_level,
                    "applies_to_stream": row.applies_to_stream,
                    "verified": row.verified,
                }
                for row in rows
            ]
        )

    def post(self, request):
        try:
            ruleset = PedagogyRuleSet.objects.create(
                name=request.data.get("name", ""),
                version=int(request.data.get("version", 1)),
                is_active=bool(request.data.get("is_active", False)),
                applies_to_level=request.data.get("applies_to_level", ""),
                applies_to_stream=request.data.get("applies_to_stream", ""),
                json=request.data.get("json", {}),
                verified=bool(request.data.get("verified", False)),
            )
        except PedagogyRulesError as exc:
            raise ValidationError({"json": str(exc)}) from exc
        return Response({"id": str(ruleset.uuid)}, status=status.HTTP_201_CREATED)


class StaffRuleSetDetailView(APIView):
    permission_classes = [IsAdminUser]

    def get_object(self, pk) -> PedagogyRuleSet:
        return get_object_or_404(PedagogyRuleSet, uuid=pk)

    def get(self, request, pk):
        ruleset = self.get_object(pk)
        return Response(
            {
                "id": str(ruleset.uuid),
                "name": ruleset.name,
                "version": ruleset.version,
                "is_active": ruleset.is_active,
                "applies_to_level": ruleset.applies_to_level,
                "applies_to_stream": ruleset.applies_to_stream,
                "verified": ruleset.verified,
                "json": ruleset.json,
            }
        )

    def put(self, request, pk):
        ruleset = self.get_object(pk)
        try:
            validate_pedagogy_rules(request.data.get("json", ruleset.json))
        except PedagogyRulesError as exc:
            raise ValidationError({"json": str(exc)}) from exc
        for field in ("name", "applies_to_level", "applies_to_stream"):
            if field in request.data:
                setattr(ruleset, field, request.data[field])
        if "is_active" in request.data:
            ruleset.is_active = bool(request.data["is_active"])
        if "verified" in request.data:
            ruleset.verified = bool(request.data["verified"])
        if "json" in request.data:
            ruleset.json = request.data["json"]
        ruleset.save()
        return Response({"id": str(ruleset.uuid)})
