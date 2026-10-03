from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    AcademicPeriodViewSet,
    AcademicYearViewSet,
    CommitmentExceptionViewSet,
    CommitmentViewSet,
    OnboardingStateView,
    OnboardingView,
    StudentPlannerProfileViewSet,
)
from .plan_views import (
    PlanCurrentView,
    PlanDiffView,
    PlanGenerateView,
    SessionDetailView,
    SessionSkipView,
    WeeklyReportView,
)
from .staff_views import (
    StaffDiagnosticsView,
    StaffDryRunView,
    StaffRuleSetDetailView,
    StaffRuleSetListView,
    StaffRuleSetValidateView,
)

router = DefaultRouter()
router.register(r"academic-years", AcademicYearViewSet, basename="planner-academic-year")
router.register(r"academic-periods", AcademicPeriodViewSet, basename="planner-academic-period")
router.register(r"profile", StudentPlannerProfileViewSet, basename="planner-profile")
router.register(r"commitments", CommitmentViewSet, basename="planner-commitment")
router.register(
    r"commitment-exceptions",
    CommitmentExceptionViewSet,
    basename="planner-commitment-exception",
)

urlpatterns = [
    path("onboarding/state/", OnboardingStateView.as_view(), name="planner-onboarding-state"),
    path("onboarding/", OnboardingView.as_view(), name="planner-onboarding"),
    path("plans/generate/", PlanGenerateView.as_view(), name="planner-plan-generate"),
    path("plans/current/", PlanCurrentView.as_view(), name="planner-plan-current"),
    path("plans/<uuid:pk>/diff/", PlanDiffView.as_view(), name="planner-plan-diff"),
    path("sessions/<uuid:pk>/", SessionDetailView.as_view(), name="planner-session-detail"),
    path("sessions/<uuid:pk>/skip/", SessionSkipView.as_view(), name="planner-session-skip"),
    path("reports/weekly/", WeeklyReportView.as_view(), name="planner-weekly-report"),
    path("staff/diagnostics/", StaffDiagnosticsView.as_view(), name="planner-staff-diagnostics"),
    path("staff/dry-run/", StaffDryRunView.as_view(), name="planner-staff-dry-run"),
    path("staff/rules/", StaffRuleSetListView.as_view(), name="planner-staff-rules"),
    path("staff/rules/validate/", StaffRuleSetValidateView.as_view(), name="planner-staff-rules-validate"),
    path("staff/rules/<uuid:pk>/", StaffRuleSetDetailView.as_view(), name="planner-staff-rule-detail"),
    path("", include(router.urls)),
]
