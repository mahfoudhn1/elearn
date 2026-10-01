from django.core.management.base import BaseCommand

from tracking.goals import close_finished_periods


class Command(BaseCommand):
    help = (
        "Close finished study-goal periods: create/refresh GoalPeriodResult "
        "rows and emit GOAL_MET activity events. Idempotent."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--today",
            default=None,
            help="Optional ISO date to treat as today (testing/backfill).",
        )

    def handle(self, *args, **options):
        from datetime import date

        today = options.get("today")
        if today:
            today = date.fromisoformat(today)

        stats = close_finished_periods(today=today)
        self.stdout.write(
            self.style.SUCCESS(
                "closed periods: "
                f"created={stats['created']} "
                f"updated={stats['updated']} "
                f"goal_met_events={stats['met_events']}"
            )
        )
