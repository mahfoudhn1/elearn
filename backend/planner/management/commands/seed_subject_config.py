"""Seed SubjectConfig rows from a JSON fixture.

The bundled fixture is PLACEHOLDER data (coefficients are invented), so every
row is written with ``verified=False``. Tracked in ``docs/TO_VERIFY.md``.
"""

from __future__ import annotations

import json
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError

from planner.models import SubjectConfig

DEFAULT_FIXTURE = (
    Path(__file__).resolve().parents[2] / "fixtures" / "subject_config.sample.json"
)


class Command(BaseCommand):
    help = "Seed subject coefficients from a JSON fixture (placeholder data)."

    def add_arguments(self, parser):
        parser.add_argument("--path", default=str(DEFAULT_FIXTURE))

    def handle(self, *args, **options):
        path = Path(options["path"])
        if not path.exists():
            raise CommandError(f"Fixture not found: {path}")
        try:
            payload = json.loads(path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as exc:
            raise CommandError(f"Invalid JSON in {path}: {exc}") from exc

        created = updated = 0
        for row in payload.get("subjects", []):
            _, was_created = SubjectConfig.objects.update_or_create(
                subject=row["subject"],
                level=row.get("level", ""),
                stream=row.get("stream", ""),
                defaults={
                    "coefficient": row.get("coefficient", 1),
                    "weekly_target_minutes": row.get("weekly_target_minutes"),
                    "verified": row.get("verified", False),
                    "source_note": row.get("source_note", ""),
                },
            )
            created += int(was_created)
            updated += int(not was_created)

        self.stdout.write(
            self.style.SUCCESS(f"Subject configs created: {created}, updated: {updated}")
        )
        self.stdout.write(
            self.style.WARNING(
                "Placeholder coefficients. Verify against the official curriculum "
                "and update docs/TO_VERIFY.md."
            )
        )
