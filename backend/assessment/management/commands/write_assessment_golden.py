"""Write the assessment golden scenario snapshots.

Usage: ``python manage.py write_assessment_golden``. Regenerate only when a
behaviour change is intended; the diff is the point.
"""

from __future__ import annotations

import json
from pathlib import Path

from django.core.management.base import BaseCommand

from assessment.golden_scenarios import all_scenarios

DEFAULT_PATH = Path(__file__).resolve().parents[2] / "tests" / "golden" / "assessment_scenarios.json"


class Command(BaseCommand):
    help = "Write the assessment golden scenario snapshots to JSON."

    def add_arguments(self, parser):
        parser.add_argument("--path", default=str(DEFAULT_PATH))

    def handle(self, *args, **options):
        path = Path(options["path"])
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(
            json.dumps(all_scenarios(), indent=2, sort_keys=True, ensure_ascii=False),
            encoding="utf-8",
        )
        self.stdout.write(self.style.SUCCESS(f"Wrote {path}"))
