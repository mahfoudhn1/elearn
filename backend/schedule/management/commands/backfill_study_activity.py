"""Backfill the tracking activity layer from already-closed study sessions.

New sessions are mirrored automatically when they close. This command exists
for the sessions that closed before that mirror was added, so historical study
time shows up in goals, streaks and analytics.

Idempotent: each session's uuid is used as the ``client_event_id`` idempotency
key, so re-running it never double-counts.
"""

from django.core.management.base import BaseCommand

from schedule.models import StudySession
from tracking.constants import STUDY_SESSION
from tracking.services import record_activity

CLOSED_STATUSES = [StudySession.Status.COMPLETED, StudySession.Status.ABANDONED]


class Command(BaseCommand):
    help = "Mirror closed study sessions into the tracking activity layer."

    def add_arguments(self, parser):
        parser.add_argument(
            "--user",
            default=None,
            help="Only backfill this username.",
        )

    def handle(self, *args, **options):
        sessions = StudySession.objects.filter(
            status__in=CLOSED_STATUSES,
            total_focus_seconds__gt=0,
        ).select_related("schedule_item", "user")

        username = options.get("user")
        if username:
            sessions = sessions.filter(user__username=username)

        mirrored = 0
        for session in sessions.iterator():
            item = session.schedule_item
            record_activity(
                session.user,
                STUDY_SESSION,
                duration_seconds=session.total_focus_seconds,
                occurred_at=session.started_at,
                client_event_id=session.uuid,
                metadata={
                    "session": str(session.uuid),
                    "schedule_item": str(item.uuid) if item else None,
                    "schedule_item_title": getattr(item, "title", None),
                    "subject": session.subject,
                    "completed_pomodoros": session.completed_pomodoros,
                    "focus_score": session.focus_score,
                    "backfilled": True,
                },
            )
            mirrored += 1

        self.stdout.write(
            self.style.SUCCESS(f"mirrored {mirrored} study session(s) into tracking")
        )
