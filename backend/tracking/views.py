from django.contrib.auth import get_user_model
from django.db.models import Count, Sum
from django.shortcuts import get_object_or_404
from rest_framework import generics, serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from courses.access import accessible_courses_for_student
from courses.models import Course, UserLessonProgress
from courses.permissions import get_student, get_teacher
from core.views import UUIDLookupMixin

from .analytics import current_streak, summary, weekly_pattern
from .goals import (
    compute_goal_progress,
    goal_streak,
    next_period_start,
    snapshot_current_period,
    suggest_target,
)
from .models import ActivityEvent, DailyActivity, GoalPeriodResult, StudyGoal
from .serializers import (
    ActivityEventSerializer,
    GoalPeriodResultSerializer,
    StudyGoalSerializer,
)
from .services import local_today, record_activity


class ActivityEventViewSet(viewsets.ModelViewSet):
    serializer_class = ActivityEventSerializer
    permission_classes = [IsAuthenticated]
    # Events are an append-only audit trail. Edits/deletes would desync the
    # daily rollups, so only listing and creating are exposed.
    http_method_names = ["get", "post", "head", "options"]

    def get_queryset(self):
        return ActivityEvent.objects.filter(user=self.request.user)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        client_event_id = data.get("client_event_id")
        if client_event_id is not None:
            existing = ActivityEvent.objects.filter(
                user=request.user, client_event_id=client_event_id
            ).first()
            if existing is not None:
                # Idempotent replay: report success without a new row.
                return Response(
                    self.get_serializer(existing).data,
                    status=status.HTTP_200_OK,
                )

        event = record_activity(
            request.user,
            data["event_type"],
            object_uuid=data.get("object_uuid"),
            duration_seconds=data.get("duration_seconds", 0),
            metadata=data.get("metadata") or {},
            occurred_at=data.get("occurred_at"),
            client_event_id=client_event_id,
            course_uuid=data.get("course_uuid"),
        )
        return Response(
            self.get_serializer(event).data,
            status=status.HTTP_201_CREATED,
        )


class StudyGoalViewSet(UUIDLookupMixin, viewsets.ModelViewSet):
    """A user's own study goals. Delete deactivates instead of removing."""

    serializer_class = StudyGoalSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = StudyGoal.objects.filter(user=self.request.user).select_related(
            "course"
        )
        include_inactive = self.request.query_params.get("include_inactive")
        if not include_inactive:
            queryset = queryset.filter(is_active=True)
        return queryset.order_by("-is_active", "-created_at")

    def perform_create(self, serializer):
        serializer.save(
            user=self.request.user,
            effective_from=local_today(self.request.user),
        )

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(
            instance, data=request.data, partial=partial
        )
        serializer.is_valid(raise_exception=True)
        validated = serializer.validated_data

        new_metric = validated.get("metric", instance.metric)
        new_period = validated.get("period", instance.period)
        new_target = validated.get("target", instance.target)
        scope_changed = (
            new_metric != instance.metric
            or new_period != instance.period
            or new_target != instance.target
        )

        if scope_changed:
            # Freeze the open period on its current target before the change,
            # then apply the new value from the next period.
            snapshot_current_period(instance)
            serializer.save(
                effective_from=next_period_start(
                    instance.user, new_period, local_today(instance.user)
                )
            )
        else:
            serializer.save()
        return Response(serializer.data)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.is_active:
            instance.is_active = False
            instance.save(update_fields=["is_active"])
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=["get"])
    def progress(self, request):
        goals = (
            StudyGoal.objects.filter(user=request.user, is_active=True)
            .select_related("course")
            .order_by("-created_at")
        )
        data = []
        for goal in goals:
            item = self.get_serializer(goal).data
            item["progress"] = compute_goal_progress(goal)
            item["streak"] = goal_streak(goal)
            data.append(item)
        return Response(data)

    @action(detail=False, methods=["get"])
    def history(self, request):
        goal_id = request.query_params.get("goal")
        if not goal_id:
            return Response(
                {"goal": ["This query parameter is required."]},
                status=status.HTTP_400_BAD_REQUEST,
            )
        goal = get_object_or_404(StudyGoal, uuid=goal_id, user=request.user)
        try:
            limit = int(request.query_params.get("limit", 12))
        except (TypeError, ValueError):
            limit = 12
        limit = min(max(limit, 1), 100)
        results = GoalPeriodResult.objects.filter(goal=goal).order_by(
            "-period_start"
        )[:limit]
        return Response(GoalPeriodResultSerializer(results, many=True).data)

    @action(detail=False, methods=["get"])
    def suggestions(self, request):
        metric = request.query_params.get("metric")
        period = request.query_params.get("period")
        if (
            metric not in StudyGoal.Metric.values
            or period not in StudyGoal.Period.values
        ):
            return Response(
                {
                    "detail": (
                        "metric and period are required and must be valid choices."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(suggest_target(request.user, metric, period))


def _streak_days(user):
    return current_streak(user)


class TrackingOverviewView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        events = ActivityEvent.objects.filter(user=request.user)
        summary = {
            "total_events": events.count(),
            "video_watch_minutes": int(sum(events.filter(event_type="VIDEO_WATCH").values_list("duration_seconds", flat=True)) / 60),
            "lessons_completed": events.filter(event_type="LESSON_COMPLETED").count(),
            "quizzes_submitted": events.filter(event_type="QUIZ_SUBMITTED").count(),
            "streak_days": _streak_days(request.user),
        }
        return Response(summary)


class DailyActivityView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = serializers.Serializer

    def get(self, request, *args, **kwargs):
        rows = DailyActivity.objects.filter(user=request.user).order_by("-date")
        data = [
            {
                "date": row.date.isoformat(),
                "event_count": row.event_count,
                "lesson_count": row.lesson_count,
                "quiz_count": row.quiz_count,
                "watch_minutes": row.watch_minutes,
            }
            for row in rows
        ]
        return Response(data)


class StudentCoursesProgressView(generics.ListAPIView):
    """Per-course progress for the requesting student."""

    permission_classes = [IsAuthenticated]
    serializer_class = serializers.Serializer

    def get(self, request, *args, **kwargs):
        student = get_student(request.user)
        if not student:
            return Response([])

        courses = accessible_courses_for_student(student).prefetch_related("lessons")
        data = []
        for course in courses:
            lessons = list(course.lessons.all())
            total = len(lessons)
            completed = UserLessonProgress.objects.filter(
                student=student,
                lesson__in=lessons,
                is_finished=True,
            ).count()
            last_activity = (
                ActivityEvent.objects.filter(user=request.user)
                .order_by("-occurred_at")
                .first()
            )
            data.append(
                {
                    "course": str(course.uuid),
                    "title": course.title,
                    "lessons_completed": completed,
                    "lessons_total": total,
                    "percent": round((completed / total) * 100) if total else 0,
                    "last_activity_at": (
                        last_activity.occurred_at if last_activity else None
                    ),
                }
            )
        return Response(data)


class TeacherStudentsProgressView(generics.ListAPIView):
    """Per-student progress across the requesting teacher's courses."""

    permission_classes = [IsAuthenticated]
    serializer_class = serializers.Serializer

    def get(self, request, *args, **kwargs):
        teacher = get_teacher(request.user)
        if not teacher:
            raise PermissionDenied("Only teachers can view student progress.")

        courses = Course.objects.filter(teacher=teacher).prefetch_related("lessons")
        course_ids = [course.id for course in courses]

        from django.db.models import Q

        students = (
            get_user_model()
            .objects.filter(student__lesson_progress__lesson__course_id__in=course_ids)
            .distinct()
            .select_related("student")
        )

        course_uuid = request.query_params.get("course")
        lessons_by_course = {str(course.uuid): course for course in courses}

        data = []
        for user in students:
            student = user.student
            progress_rows = UserLessonProgress.objects.filter(
                student=student, lesson__course_id__in=course_ids
            ).select_related("lesson__course")

            courses_data = []
            total_completed = 0
            total_lessons = 0
            for course in courses:
                if course_uuid and str(course.uuid) != course_uuid:
                    continue
                lessons = list(course.lessons.all())
                course_total = len(lessons)
                course_completed = sum(
                    1
                    for row in progress_rows
                    if row.lesson.course_id == course.id and row.is_finished
                )
                total_completed += course_completed
                total_lessons += course_total
                courses_data.append(
                    {
                        "course": str(course.uuid),
                        "title": course.title,
                        "lessons_completed": course_completed,
                        "lessons_total": course_total,
                        "percent": (
                            round((course_completed / course_total) * 100)
                            if course_total
                            else 0
                        ),
                    }
                )

            attempts = [
                {
                    "survey": str(attempt.survey.uuid),
                    "title": attempt.survey.title,
                    "score": attempt.score,
                    "submitted_at": attempt.submitted_at,
                }
                for attempt in student.survey_attempts.select_related("survey")
                if attempt.survey.course_id in course_ids
            ]

            data.append(
                {
                    "student": str(student.uuid),
                    "student_name": str(student),
                    "courses": courses_data,
                    "overall_percent": (
                        round((total_completed / total_lessons) * 100)
                        if total_lessons
                        else 0
                    ),
                    "quiz_attempts": attempts,
                }
            )
        return Response(data)


class AnalyticsSummaryView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        range_key = request.query_params.get("range", "7d")
        if range_key not in ("7d", "30d", "90d"):
            return Response(
                {"range": ["range must be one of: 7d, 30d, 90d."]},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(summary(request.user, range_key))


class WeeklyPatternView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        range_key = request.query_params.get("range")
        if range_key is not None and range_key not in ("7d", "30d", "90d"):
            return Response(
                {"range": ["range must be one of: 7d, 30d, 90d."]},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(weekly_pattern(request.user, range_key))
