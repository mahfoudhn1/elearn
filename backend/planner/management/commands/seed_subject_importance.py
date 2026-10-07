"""Seed SubjectImportance rows from a JSON fixture.

The bundled fixture is PLACEHOLDER data (coefficients are invented), so every
row is written with ``verified=False``. The tier is derived from the coefficient
against the pedagogy rule-set thresholds -- never invented here. Tracked in
``docs/TO_VERIFY.md``.
"""

from __future__ import annotations

import json
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError

from planner.engine.pedagogy import load_pedagogy_rules
from planner.models import AcademicYear, SubjectImportance

DEFAULT_FIXTURE = (
    Path(__file__).resolve().parents[2] / "fixtures" / "subject_importance.sample.json"
)


class Command(BaseCommand):
    help = "Seed subject importance tiers from a JSON fixture (placeholder data)."

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

        thresholds = load_pedagogy_rules().tier_thresholds
        year = AcademicYear.objects.filter(is_current=True).order_by("-start_date").first()

        created = updated = 0
        for row in payload.get("importances", []):
            coefficient = row.get("coefficient")
            tier = row.get("tier") or thresholds.tier_for(
                None if coefficient is None else float(coefficient)
            )
            _, was_created = SubjectImportance.objects.update_or_create(
                subject=row["subject"],
                level=row.get("level", ""),
                stream=row.get("stream", ""),
                defaults={
                    "coefficient": coefficient,
                    "tier": tier,
                    "academic_year": year,
                    "verified": row.get("verified", False),
                    "source_note": row.get("source_note", ""),
                },
            )
            created += int(was_created)
            updated += int(not was_created)

        self.stdout.write(
            self.style.SUCCESS(
                f"Subject importance created: {created}, updated: {updated}"
            )
        )
        self.stdout.write(
            self.style.WARNING(
                "Placeholder importance tiers. Verify against the official "
                "curriculum and update docs/TO_VERIFY.md."
            )
        )