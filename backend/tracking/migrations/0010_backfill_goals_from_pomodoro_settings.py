"""Backfill Goal rows from existing PomodoroSettings.daily_goal_minutes.

Safe and reversible: forwards creates one active DAILY goal per user that has
Pomodoro settings (skipping users who already have one); backwards deletes
exactly the rows this migration created, tracked through Goal.metadata, so
goals the user created or edited afterwards are never touched.
"""

from django.db import migrations
from django.utils import timezone


FORWARD_FLAG = "_backfilled_from_pomodoro"


def forwards(apps, schema_editor):
    Goal = apps.get_model("tracking", "Goal")
    try:
        PomodoroSettings = apps.get_model("schedule", "PomodoroSettings")
    except LookupError:  # pragma: no cover - schedule app is always present
        return

    now = timezone.now()
    for prefs in PomodoroSettings.objects.all().iterator():
        if Goal.objects.filter(
            user_id=prefs.user_id, period="DAILY", is_active=True
        ).exists():
            continue
        Goal.objects.create(
            user_id=prefs.user_id,
            metric="MINUTES",
            period="DAILY",
            target=int(prefs.daily_goal_minutes or 0),
            is_active=True,
            effective_from=now.date(),
            overrides={},
            weekday_overrides={},
            metadata={FORWARD_FLAG: True},
            created_at=now,
            updated_at=now,
        )


def backwards(apps, schema_editor):
    Goal = apps.get_model("tracking", "Goal")
    Goal.objects.filter(metadata__contains={FORWARD_FLAG: True}).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("tracking", "0009_goal_metadata"),
        ("schedule", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(forwards, backwards),
    ]
