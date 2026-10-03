"""Replan triggers with debounce.

Each trigger asks for a new plan version (the trigger name is stored on
``StudyPlan.trigger``). A trigger is ignored while the latest plan is fresh and
was produced by the same trigger.
"""

from __future__ import annotations

from datetime import timedelta

from django.utils import timezone

from planner.models import StudentPlannerProfile, StudyPlan
from planner.services import plan_service


class ReplanTrigger:
    COMMITMENT = "COMMITMENT"
    EXAM = "EXAM"
    SESSION_MISSED = "SESSION_MISSED"
    WEEKLY = "WEEKLY"
    AVAILABILITY = "AVAILABILITY"
    MANUAL = "MANUAL"


def default_window(now=None, days: int = 7):
    now = now or timezone.now()
    profile_tz = timezone.get_current_timezone()
    today = now.astimezone(profile_tz).date()
    return (today, today + timedelta(days=days - 1))


def request_replan(student, trigger, window=None, now=None, force: bool = False):
    """Generate a new plan version unless debounced. Returns the plan or None."""
    now = now or timezone.now()
    profile = StudentPlannerProfile.objects.filter(student=student).first()
    if profile is None or not profile.onboarding_completed:
        return None

    window = window or default_window(now)

    if not force:
        latest = StudyPlan.objects.filter(student=student).order_by("-version").first()
        if latest is not None and latest.trigger == trigger:
            rules = plan_service._pedagogy_rules(plan_service._active_rule_set())
            debounce = timedelta(minutes=rules.history.replan_debounce_minutes)
            if now - latest.created_at < debounce:
                return None

    result = plan_service.generate_plan_for_student(
        student, window, trigger, now, force=force
    )
    return result.plan
