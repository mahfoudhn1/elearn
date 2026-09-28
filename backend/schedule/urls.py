from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    PersonalScheduleItemViewSet,
    PomodoroSettingsView,
    ProductivityViewSet,
    StudySessionViewSet,
)

router = DefaultRouter()
router.register(r"schedule", PersonalScheduleItemViewSet, basename="personal-schedule")

# Registered top-level rather than nested under "schedule/". DRF's default
# lookup_value_regex is [^/.]+, so "schedule/study-sessions/" would be swallowed
# by the existing "schedule/{pk}/" detail route above.
router.register(r"study-sessions", StudySessionViewSet, basename="study-session")
router.register(r"productivity", ProductivityViewSet, basename="productivity")

urlpatterns = [
    path("pomodoro-settings/", PomodoroSettingsView.as_view(), name="pomodoro-settings"),
    path("", include(router.urls)),
]
