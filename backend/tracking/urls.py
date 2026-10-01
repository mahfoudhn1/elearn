from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    ActivityEventViewSet,
    AnalyticsSummaryView,
    DailyActivityView,
    StudentCoursesProgressView,
    StudyGoalViewSet,
    TeacherStudentsProgressView,
    TrackingOverviewView,
    WeeklyPatternView,
)

router = DefaultRouter()
router.register(r"events", ActivityEventViewSet, basename="tracking-event")
router.register(r"goals", StudyGoalViewSet, basename="tracking-goal")

urlpatterns = [
    path("overview/", TrackingOverviewView.as_view(), name="tracking-overview"),
    path("daily/", DailyActivityView.as_view(), name="tracking-daily"),
    path(
        "analytics/summary/",
        AnalyticsSummaryView.as_view(),
        name="tracking-analytics-summary",
    ),
    path(
        "analytics/weekly-pattern/",
        WeeklyPatternView.as_view(),
        name="tracking-analytics-weekly-pattern",
    ),
    path(
        "student/courses/",
        StudentCoursesProgressView.as_view(),
        name="tracking-student-courses",
    ),
    path(
        "teacher/students/",
        TeacherStudentsProgressView.as_view(),
        name="tracking-teacher-students",
    ),
    path("", include(router.urls)),
]
