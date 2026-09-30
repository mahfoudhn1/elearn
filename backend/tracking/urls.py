from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    ActivityEventViewSet,
    DailyActivityView,
    StudentCoursesProgressView,
    TeacherStudentsProgressView,
    TrackingOverviewView,
)

router = DefaultRouter()
router.register(r"events", ActivityEventViewSet, basename="tracking-event")

urlpatterns = [
    path("overview/", TrackingOverviewView.as_view(), name="tracking-overview"),
    path("daily/", DailyActivityView.as_view(), name="tracking-daily"),
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
