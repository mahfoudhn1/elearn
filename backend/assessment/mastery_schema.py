"""JSON-schema validation for mastery/readiness rule sets.

Pure Python (``jsonschema`` only, no Django). The model and the engine both call
:func:`validate_mastery_rules` so the same rules are accepted everywhere.

Every numeric knob in the rule set carries a sibling ``why`` string (the human
rationale). All values are placeholders (``verified: false``) tracked in
``docs/TO_VERIFY.md`` until a human confirms them.
"""

from __future__ import annotations

import jsonschema

# A difficulty -> weight map whose keys are the 1-5 rating strings.
_DIFFICULTY_WEIGHTS = {
    "type": "object",
    "required": ["why"],
    "properties": {
        "1": {"type": "number", "minimum": 0},
        "2": {"type": "number", "minimum": 0},
        "3": {"type": "number", "minimum": 0},
        "4": {"type": "number", "minimum": 0},
        "5": {"type": "number", "minimum": 0},
        "why": {"type": "string", "minLength": 1},
    },
    "additionalProperties": False,
}

# A source -> weight map (QUIZ / PLANNER_EXERCISE / FLASHCARD / TEACHER_GRADE).
_SOURCE_WEIGHTS = {
    "type": "object",
    "required": ["why"],
    "properties": {
        "QUIZ": {"type": "number", "minimum": 0},
        "PLANNER_EXERCISE": {"type": "number", "minimum": 0},
        "FLASHCARD": {"type": "number", "minimum": 0},
        "TEACHER_GRADE": {"type": "number", "minimum": 0},
        "why": {"type": "string", "minLength": 1},
    },
    "additionalProperties": False,
}

MASTERY_SCHEMA = {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "type": "object",
    "required": [
        "source_weights",
        "difficulty_weights",
        "half_life_days",
        "half_life_days_why",
        "per_question_repeat_cap",
        "confidence",
        "readiness",
        "readiness_bands",
        "trend",
    ],
    "properties": {
        "source_weights": _SOURCE_WEIGHTS,
        "difficulty_weights": _DIFFICULTY_WEIGHTS,
        "half_life_days": {"type": "number", "exclusiveMinimum": 0},
        "half_life_days_why": {"type": "string", "minLength": 1},
        "per_question_repeat_cap": {
            "type": "object",
            "required": ["window_days", "max_weight", "why"],
            "properties": {
                "window_days": {"type": "integer", "minimum": 1},
                "max_weight": {"type": "number", "exclusiveMinimum": 0},
                "why": {"type": "string", "minLength": 1},
            },
            "additionalProperties": False,
        },
        "confidence": {
            "type": "object",
            "required": ["min_effective_weight", "min_distinct_days", "low_fraction", "why"],
            "properties": {
                "min_effective_weight": {"type": "number", "exclusiveMinimum": 0},
                "min_distinct_days": {"type": "integer", "minimum": 1},
                "low_fraction": {"type": "number", "exclusiveMinimum": 0, "maximum": 1},
                "why": {"type": "string", "minLength": 1},
            },
            "additionalProperties": False,
        },
        "readiness": {
            "type": "object",
            "required": ["coverage_min", "why"],
            "properties": {
                "coverage_min": {"type": "number", "minimum": 0, "maximum": 1},
                "why": {"type": "string", "minLength": 1},
            },
            "additionalProperties": False,
        },
        "readiness_bands": {
            "type": "object",
            "required": ["weak_max", "developing_max", "secure_max", "why"],
            "properties": {
                "weak_max": {"type": "number", "minimum": 0, "maximum": 1},
                "developing_max": {"type": "number", "minimum": 0, "maximum": 1},
                "secure_max": {"type": "number", "minimum": 0, "maximum": 1},
                "why": {"type": "string", "minLength": 1},
            },
            "additionalProperties": False,
        },
        "trend": {
            "type": "object",
            "required": [
                "window_days",
                "min_effective_weight",
                "delta_threshold",
                "why",
            ],
            "properties": {
                "window_days": {"type": "integer", "minimum": 1},
                "min_effective_weight": {"type": "number", "exclusiveMinimum": 0},
                "delta_threshold": {"type": "number", "minimum": 0, "maximum": 1},
                "why": {"type": "string", "minLength": 1},
            },
            "additionalProperties": False,
        },
        "version": {"type": "integer"},
        "verified": {"type": "boolean"},
        "source_note": {"type": "string"},
    },
    "additionalProperties": True,
}


class MasteryRulesError(ValueError):
    """Raised when a mastery rule set does not satisfy the schema."""


def validate_mastery_rules(data) -> None:
    """Validate ``data`` against :data:`MASTERY_SCHEMA`."""
    if not isinstance(data, dict):
        raise MasteryRulesError("Mastery rules must be a JSON object.")
    try:
        jsonschema.validate(data, MASTERY_SCHEMA)
    except jsonschema.ValidationError as exc:
        path = "/".join(str(part) for part in exc.absolute_path) or "<root>"
        raise MasteryRulesError(f"{path}: {exc.message}") from exc
