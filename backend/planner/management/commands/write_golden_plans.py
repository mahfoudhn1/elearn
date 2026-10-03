"""Regenerate the engine golden files (planner/tests/golden/*.json).

Run after any intentional engine change: python manage.py write_golden_plans
"""

from __future__ import annotations

import json
from pathlib import Path

from django.core.management.base import BaseCommand

from planner.engine import generate_plan, load_rules
from planner.engine.serde import engine_input_to_dict, engine_output_to_dict
from planner.golden_scenarios import NOW, SCENARIOS

GOLDEN_DIR = Path(__file__).resolve().parents[2] / "tests" / "golden"


class Command(BaseCommand):
    help = "Write golden input/expected JSON files for the 10 engine scenarios."

    def handle(self, *args, **options):
        GOLDEN_DIR.mkdir(parents=True, exist_ok=True)
        for name, builder in SCENARIOS.items():
            engine_input = builder()
            output = generate_plan(engine_input, load_rules(), NOW)
            payload = {
                "scenario": name,
                "input": engine_input_to_dict(engine_input, NOW),
                "expected": engine_output_to_dict(output),
            }
            (GOLDEN_DIR / f"{name}.json").write_text(
                json.dumps(payload, indent=2, ensure_ascii=False, sort_keys=True),
                encoding="utf-8",
            )
            self.stdout.write(self.style.SUCCESS(f"Wrote {name}.json"))
