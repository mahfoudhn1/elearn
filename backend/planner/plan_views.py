"""Plan generation, viewing, diff and session override endpoints."""

from __future__ import annotations

from datetime import date, timedelta
from uuid import UUID

from django.shortcuts import get_object_or_404
from django.db import transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from courses.permissions import get_student

from .models import PlannedSession, PlannedSessionEvent, StudyPlan, StudentPlannerProfile
from .permissions import HasStudentProfile
from .serializers import (
    GeneratePlanInputSerializer,
    PlannedSessionSerializer,
    PlannedSessionEventSerializer,
    SessionMoveInputSerializer,
    StudyPlanSerializer,
)
from .services import plan_service, replan_service, report_service
from .rule_based import generate_week


def _canonical_subject(name: str) -> str:
    """Map the Arabic subject labels used by Student to planner identifiers."""
    value = (name or "").strip().lower()
    aliases = {
        "رياضيات": "math", "math": "math", "فيزياء": "physics", "physics": "physics",
        "عربية": "arabic", "العربية": "arabic", "arabic": "arabic",
        "فلسفة": "philosophy", "philosophy": "philosophy", "فرنسية": "french", "french": "french",
        "إنجليزية": "english", "انجليزية": "english", "english": "english",
        "ألمانية": "german", "german": "german", "إسبانية": "spanish", "اسبانية": "spanish", "spanish": "spanish",
        "علوم طبيعية": "svt", "علوم": "svt", "svt": "svt",
        "تاريخ وجغرافيا": "history-geography", "history-geography": "history-geography",
        "إسلامية": "islamic", "islamic": "islamic",
    }
    return aliases.get(value, value)


def _weakness_from_scores(student) -> dict[str, float]:
    """Turn low test/mastery results into more repetition for that subject."""
    from django.db.models import Avg
    from assessment.models import TopicMastery
    from planner.models import SubjectConfidence, SubjectProficiency

    pressure = {}
    for row in SubjectProficiency.objects.filter(student=student):
        pressure[_canonical_subject(row.subject)] = max(0.0, min(1.0, (100 - row.score) / 100))
    confidence_pressure = {"WEAK": 1.0, "AVERAGE": 0.55, "GOOD": 0.2, "VERY_GOOD": 0.05}
    for row in SubjectConfidence.objects.filter(student=student):
        pressure.setdefault(_canonical_subject(row.subject), confidence_pressure.get(row.level, 0.55))
    for row in TopicMastery.objects.filter(student=student).values("topic__chapter__subject").annotate(avg=Avg("mastery")):
        if row["avg"] is not None:
            subject = _canonical_subject(row["topic__chapter__subject"])
            pressure[subject] = max(pressure.get(subject, 0.0), 1.0 - float(row["avg"]))
    return pressure


class PlanGenerateView(APIView):
    permission_classes = [IsAuthenticated, HasStudentProfile]

    def post(self, request):
        student = get_student(request.user)
        serializer = GeneratePlanInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        # This endpoint intentionally uses the deterministic rules planner.
        profile, _ = StudentPlannerProfile.objects.get_or_create(student=student)
        profile = StudentPlannerProfile.objects.select_related(
            "student__grade", "student__field_of_study"
        ).get(pk=profile.pk)
        grade_name = profile.level or profile.student.grade.name
        stream_name = profile.stream or profile.student.field_of_study.name
        first_day = data["window_start"]
        first_sunday = first_day - timedelta(days=(first_day.weekday() + 1) % 7)
        # A plan is a weekly template.  For a longer requested window, copy
        # that template into every week so the schedule really repeats rather
        # than silently planning only the first seven days.
        generated_weeks = []
        cursor = first_sunday
        weakness = _weakness_from_scores(student)
        while cursor <= data["window_end"]:
            generated_weeks.append(generate_week(
                grade=grade_name, stream=stream_name, week_start=cursor, weakness=weakness
            ))
            if not data["repeat_weekly"]:
                break
            cursor += timedelta(days=7)
        generated = {
            "sessions": [row for week in generated_weeks for row in week["sessions"]
                         if data["window_start"] <= date.fromisoformat(row["day"]) <= data["window_end"]],
            "unplaced": [row for week in generated_weeks for row in week["unplaced"]],
            "usable_minutes": sum(week["usable_minutes"] for week in generated_weeks),
        }
        with transaction.atomic():
            latest = StudyPlan.objects.filter(student=student).order_by("-version").first()
            version = latest.version + 1 if latest else 1
            old_sessions = PlannedSession.objects.filter(
                student=student, state=PlannedSession.State.PLANNED
            )
            old_uuids = list(old_sessions.values_list("uuid", flat=True))
            old_sessions.update(state=PlannedSession.State.CANCELLED)
            from schedule.models import PersonalScheduleItem
            PersonalScheduleItem.objects.filter(
                planned_session_id__in=old_uuids
            ).update(status=PersonalScheduleItem.Status.CANCELLED)
            StudyPlan.objects.filter(student=student).delete()
            plan = StudyPlan.objects.create(
                student=student, version=version,
                window_start=data["window_start"], window_end=data["window_end"],
                input_hash=f"rule-based:{first_sunday.isoformat()}:{grade_name}:{stream_name}",
                trigger=data["trigger"],
                input_snapshot={
                    "planner": "rule_based",
                    "config_key": f"{grade_name}_{stream_name}",
                    "repeat_weekly": data["repeat_weekly"],
                    "weekly_template": True,
                },
                engine_diagnostics={
                    "usable_minutes": generated["usable_minutes"],
                    "unplaced": generated["unplaced"],
                },
            )
            from .models import CurriculumVersion, StudentTopicProgress, SubjectCurrentTopic, Topic
            db_topics = {}
            curriculum_levels = [grade_name]
            school_level = getattr(getattr(profile.student, "grade", None), "school_level", None)
            if school_level is not None:
                curriculum_levels.append(school_level.name)
            for db_topic in Topic.objects.filter(
                chapter__curriculum__level__in=curriculum_levels,
                chapter__curriculum__stream=stream_name,
                chapter__curriculum__status=CurriculumVersion.Status.ACTIVE,
                is_published=True,
            ).select_related("chapter").order_by("chapter__subject", "chapter__order", "order", "id"):
                db_topics.setdefault(_canonical_subject(db_topic.chapter.subject), []).append(db_topic)

            topic_progress = {
                row.topic_id: row
                for row in StudentTopicProgress.objects.filter(
                    student=student, topic__in=[topic for topics in db_topics.values() for topic in topics]
                )
            }
            current_topics = {
                _canonical_subject(row.subject): row.topic
                for row in SubjectCurrentTopic.objects.filter(student=student).select_related("topic")
            }
            topic_cursor = {}
            for subject, topics in db_topics.items():
                current = current_topics.get(subject)
                start_index = next((i for i, topic in enumerate(topics) if current and topic.pk == current.pk), 0)
                pending = [
                    topic for topic in topics[start_index:] + topics[:start_index]
                    if topic_progress.get(topic.pk) is None or topic_progress[topic.pk].status not in (
                        StudentTopicProgress.Status.COVERED,
                        StudentTopicProgress.Status.MASTERED,
                    )
                ]
                topic_cursor[subject] = pending or topics

            sessions = []
            for row in generated["sessions"]:
                start_dt = row["start_dt"]
                if timezone.is_naive(start_dt):
                    start_dt = timezone.make_aware(start_dt, timezone.get_current_timezone())
                end_dt = row["end_dt"]
                if timezone.is_naive(end_dt):
                    end_dt = timezone.make_aware(end_dt, timezone.get_current_timezone())
                metadata = {
                    key: row.get(key)
                    for key in (
                        "type", "label", "topic_id", "topic_title_ar", "topic_title_fr",
                        "chapter_title_ar", "topic_order", "phase", "part", "parts",
                        "review_topic_id",
                    )
                }
                topic = None
                if row.get("topic_id"):
                    try:
                        topic_uuid = UUID(str(row["topic_id"]))
                    except (TypeError, ValueError):
                        topic_uuid = None
                    if topic_uuid:
                        topic = Topic.objects.filter(uuid=topic_uuid).first()
                    if topic is None:
                        topic_order = row.get("topic_order")
                        subject = _canonical_subject(row["subject"])
                        candidates = topic_cursor.get(subject, [])
                        if candidates:
                            topic = candidates[topic_order - 1] if topic_order and 0 < int(topic_order) <= len(candidates) else candidates[0]
                            topic_cursor[subject] = candidates[1:] + candidates[:1]
                if topic is not None:
                    metadata.update({
                        "topic_id": str(topic.uuid),
                        "topic_title_ar": topic.title_ar,
                        "topic_title_fr": topic.title_fr,
                        "chapter_title_ar": topic.chapter.title_ar,
                        "chapter_title_fr": topic.chapter.title_fr,
                        "topic_order": topic.order,
                        "trimester": topic.trimester,
                    })
                session = PlannedSession.objects.create(
                    plan=plan, student=student, subject=row["subject"], activity_type="STUDY",
                    start_dt=start_dt, end_dt=end_dt, focus_minutes=row["minutes"],
                    topic=topic,
                    rule_metadata=metadata,
                )
                sessions.append(session)
        http_status = status.HTTP_201_CREATED
        return Response(
            {
                "plan": StudyPlanSerializer(plan).data,
                "created": True,
                "sessions": PlannedSessionSerializer(sessions, many=True).data,
                "unplaced": generated["unplaced"],
                "usable_minutes": generated["usable_minutes"],
                "diff": {"added": [], "removed": [], "moved": []},
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


class SessionEventsView(APIView):
    """Read-only lifecycle history for a session owned by the caller."""

    permission_classes = [IsAuthenticated, HasStudentProfile]

    def get(self, request, pk):
        student = get_student(request.user)
        session = PlannedSession.objects.filter(student=student, uuid=pk).first()
        if session is None:
            raise ValidationError({"session": ["Not found."]})
        events = PlannedSessionEvent.objects.filter(
            student=student,
            planned_session=session,
        )
        return Response(PlannedSessionEventSerializer(events, many=True).data)


class SessionPracticeQuizView(APIView):
    """Offer the practice quiz attached to a topic REVIEW/EXERCISES session.

    Returns the quiz (attaching one on the fly when the session has a topic and
    an active TOPIC_PRACTICE quiz exists), or ``{"quiz": null}``.
    """

    permission_classes = [IsAuthenticated, HasStudentProfile]

    def get(self, request, pk):
        student = get_student(request.user)
        session = PlannedSession.objects.filter(student=student, uuid=pk).first()
        if session is None:
            raise ValidationError({"session": ["Not found."]})
        from planner.mastery_planner import attach_practice_quiz

        quiz = attach_practice_quiz(session)
        if quiz is None:
            return Response({"quiz": None, "session": str(session.uuid)})
        return Response(
            {
                "quiz": {
                    "id": str(quiz.uuid),
                    "title": quiz.title,
                    "kind": quiz.kind,
                    "subject": quiz.subject,
                },
                "session": str(session.uuid),
            }
        )


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
