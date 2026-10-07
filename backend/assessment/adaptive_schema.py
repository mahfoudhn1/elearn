"""JSON-schema validation for adaptive-diagnostic rule sets.

Pure Python (``jsonschema`` only, no Django). The model and the engine both call
:func:`validate_adaptive_rules` so the same rules are accepted everywhere.

Every numeric knob in the rule set carries a sibling ``why`` string (the human
rationale). All values are placeholders (``verified: false``) tracked in
``docs/TO_VERIFY.md`` until a human confirms them.
"""

from __future__ import annotations

import jsonschema

ADAPTIVE_SCHEMA = {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "type": "object",
    "required": [
        "start_difficulty",
        "start_difficulty_why",
        "difficulty_step",
        "difficulty_step_why",
        "difficulty_min",
        "difficulty_min_why",
        "difficulty_max",
        "difficulty_max_why",
        "min_questions_per_topic",
        "min_questions_per_topic_why",
        "max_questions",
        "max_questions_why",
        "skip_recent_days",
        "skip_recent_days_why",
        "prefer_untested_misconceptions",
        "prefer_untested_misconceptions_why",
        "misconception_bonus",
        "misconception_bonus_why",
    ],
    "properties": {
        "start_difficulty": {"type": "integer", "minimum": 1, "maximum": 5},
        "start_difficulty_why": {"type": "string", "minLength": 1},
        "difficulty_step": {"type": "integer", "minimum": 1},
        "difficulty_step_why": {"type": "string", "minLength": 1},
        "difficulty_min": {"type": "integer", "minimum": 1, "maximum": 5},
        "difficulty_min_why": {"type": "string", "minLength": 1},
        "difficulty_max": {"type": "integer", "minimum": 1, "maximum": 5},
        "difficulty_max_why": {"type": "string", "minLength": 1},
        "min_questions_per_topic": {"type": "integer", "minimum": 1},
        "min_questions_per_topic_why": {"type": "string", "minLength": 1},
        "max_questions": {"type": "integer", "minimum": 1},
        "max_questions_why": {"type": "string", "minLength": 1},
        "skip_recent_days": {"type": "integer", "minimum": 0},
        "skip_recent_days_why": {"type": "string", "minLength": 1},
        "prefer_untested_misconceptions": {"type": "boolean"},
        "prefer_untested_misconceptions_why": {"type": "string", "minLength": 1},
        "misconception_bonus": {"type": "number", "minimum": 0},
        "misconception_bonus_why": {"type": "string", "minLength": 1},
        "coverage_round_robin": {"type": "boolean"},
        "coverage_round_robin_why": {"type": "string", "minLength": 1},
        "stop_when_covered": {"type": "boolean"},
        "stop_when_covered_why": {"type": "string", "minLength": 1},
        "version": {"type": "integer"},
        "verified": {"type": "boolean"},
        "source_note": {"type": "string"},
    },
    "additionalProperties": True,
}


class AdaptiveRulesError(ValueError):
    """Raised when an adaptive rule set does not satisfy the schema."""


def validate_adaptive_rules(data) -> None:
    """Validate ``data`` against :data:`ADAPTIVE_SCHEMA`."""
    if not isinstance(data, dict):
        raise AdaptiveRulesError("Adaptive rules must be a JSON object.")
    try:
        jsonschema.validate(data, ADAPTIVE_SCHEMA)
    except jsonschema.ValidationError as exc:
        path = "/".join(str(part) for part in exc.absolute_path) or "<root>"
        raise AdaptiveRulesError(f"{path}: {exc.message}") from exc
