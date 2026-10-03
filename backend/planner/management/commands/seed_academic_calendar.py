"""Seed academic years/periods from a JSON fixture.

The bundled fixture is PLACEHOLDER data (``verified=false``). This command
never invents dates of its own: it only writes what the JSON provides, so the
only way unverified data enters the DB is by pointing it at an unverified
fixture. Every placeholder is tracked in ``docs/TO_VERIFY.md``.

Usage::

    python manage.py seed_academic_calendar
    python manage.py seed_academic_calendar --path /path/to/calendar.json
"""

from __future__ import annotations

import json
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from django.utils.dateparse import parse_date

from planner.models import AcademicPeriod, AcademicYear

DEFAULT_FIXTURE = (
    Path(__file__).resolve().parents[2] / "fixtures" / "academic_calendar.sample.json"
)


class Command(BaseCommand):
    help = "Seed academic years and periods from a JSON fixture (placeholder data)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--path",
            default=str(DEFAULT_FIXTURE),
            help="Path to the JSON fixture. Defaults to the bundled placeholder sample.",
        )

    def handle(self, *args, **options):
        path = Path(options["path"])
        if not path.exists():
            raise CommandError(f"Fixture not found: {path}")

        try:
            payload = json.loads(path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as exc:
            raise CommandError(f"Invalid JSON in {path}: {exc}") from exc

        years_by_label = self._seed_years(payload)
        created_periods, updated_periods = self._seed_periods(payload, years_by_label)

        self.stdout.write(
            self.style.SUCCESS(
                f"Academic years: {len(years_by_label)} | "
                f"periods created: {created_periods}, updated: {updated_periods}"
            )
        )
        self.stdout.write(
            self.style.WARNING(
                "Placeholder data may be loaded. Verify every row in docs/TO_VERIFY.md "
                "and set verified=True only after checking the official source."
            )
        )

    def _seed_years(self, payload):
        years_by_label = {}
        for row in payload.get("academic_years", []):
            label = row["label"]
            start = parse_date(row["start_date"])
            end = parse_date(row["end_date"])
            if start is None or end is None:
                raise CommandError(f"Academic year '{label}' has an invalid date.")
            year, _ = AcademicYear.objects.update_or_create(
                label=label,
                defaults={
                    "start_date": start,
                    "end_date": end,
                    "is_current": row.get("is_current", False),
                },
            )
            years_by_label[label] = year
        return years_by_label

    def _seed_periods(self, payload, years_by_label):
        created = 0
        updated = 0
        for row in payload.get("academic_periods", []):
            year = years_by_label.get(row["academic_year"])
            if year is None:
                raise CommandError(
                    f"Period references unknown academic year '{row['academic_year']}'."
                )
            start = parse_date(row["start_date"])
            end = parse_date(row["end_date"])
            if start is None or end is None:
                raise CommandError(f"Period '{row.get('label')}' has an invalid date.")
            _, was_created = AcademicPeriod.objects.update_or_create(
                academic_year=year,
                kind=row["kind"],
                label=row.get("label", ""),
                start_date=start,
                defaults={
                    "end_date": end,
                    "applies_to_levels": row.get("applies_to_levels", []),
                    "suspends_school": row.get("suspends_school", False),
                    "verified": row.get("verified", False),
                    "source_note": row.get("source_note", ""),
                },
            )
            if was_created:
                created += 1
            else:
                updated += 1
        return created, updated
