"""Golden-file tests: fixed input JSON -> expected output JSON, 10 scenarios."""

import json
from pathlib import Path

from django.test import SimpleTestCase

from planner.engine import generate_plan, load_rules
from planner.engine.serde import engine_input_from_dict, engine_output_to_dict

GOLDEN_DIR = Path(__file__).resolve().parent / "tests" / "golden"


class GoldenPlanTests(SimpleTestCase):
    def test_ten_golden_scenarios(self):
        files = sorted(GOLDEN_DIR.glob("*.json"))
        self.assertEqual(len(files), 10, f"expected 10 golden files, found {len(files)}")
        for path in files:
            payload = json.loads(path.read_text(encoding="utf-8"))
            engine_input, now = engine_input_from_dict(payload["input"])
            output = generate_plan(engine_input, load_rules(), now)
            self.assertEqual(
                engine_output_to_dict(output),
                payload["expected"],
                f"golden mismatch: {path.name}",
            )

    def test_engine_is_deterministic_across_runs(self):
        path = sorted(GOLDEN_DIR.glob("*.json"))[0]
        payload = json.loads(path.read_text(encoding="utf-8"))
        engine_input, now = engine_input_from_dict(payload["input"])
        first = generate_plan(engine_input, load_rules(), now)
        second = generate_plan(engine_input, load_rules(), now)
        self.assertEqual(engine_output_to_dict(first), engine_output_to_dict(second))
