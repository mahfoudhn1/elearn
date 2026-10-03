"""Periodic plan maintenance (cron / Celery beat entry point).

Marks past unattended PLANNED sessions as MISSED and optionally triggers a
replan for students who have one.

There is no Celery worker configured in this project, so this runs as a
management command. Example crontab (every 30 minutes)::

    */30 * * * * /path/to/manage.py plan_maintenance --replan
"""

from __future__ import annotations

from django.core.management.base import BaseCommand
from django.utils import timezone

from planner.models import StudentPlannerProfile
from planner.services import history_service, replan_service


class Command(BaseCommand):
    help = "Mark missed planned sessions and optionally replan affected students."

    def add_arguments(self, parser):
        parser.add_argument(
            "--replan",
            action="store_true",
            help="Replan students whose sessions were just marked missed.",
        )

    def handle(self, *args, **options):
        missed = history_service.mark_missed_sessions(now=timezone.now())
        self.stdout.write(
            self.style.SUCCESS(f"Marked {missed} planned session(s) as MISSED.")
        )

        if options["replan"]:
            replanned = 0
            profiles = StudentPlannerProfile.objects.filter(
                onboarding_completed=True
            ).select_related("student")
            for profile in profiles:
                plan = replan_service.request_replan(
                    profile.student, replan_service.ReplanTrigger.SESSION_MISSED
                )
                if plan is not None:
                    replanned += 1
            self.stdout.write(
                self.style.SUCCESS(f"Replanned {replanned} student(s).")
            )
