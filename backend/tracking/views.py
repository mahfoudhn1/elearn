from django.contrib.auth import get_user_model
from django.db.models import Count, Sum
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, serializers, viewsets
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from courses.access import accessible_courses_for_student
from courses.models import Course, UserLessonProgress
from courses.permissions import get_student, get_teacher

from .models import ActivityEvent, DailyActivity
from .serializers import ActivityEventSerializer


class ActivityEventViewSet(viewsets.ModelViewSet):
    serializer_class = ActivityEventSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return ActivityEvent.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


def _streak_days(user):
    dates = list(
        DailyActivity.objects.filter(user=user, event_count__gt=0)
        .order_by("-date")
        .values_list("date", flat=True)
    )
    if not dates:
        return 0

    streak = 1
    today = timezone.localdate()
    if dates[0] == today:
        pass
    elif dates[0] == today - timezone.timedelta(days=1):
        pass
    else:
        return 0

    for previous, current in zip(dates, dates[1:]):
        if previous - current == timezone.timedelta(days=1):
            streak += 1
        else:
            break
    return streak


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
