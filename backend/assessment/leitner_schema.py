"""JSON-schema validation for Leitner / spaced-repetition rule sets.

Pure Python (``jsonschema`` only, no Django). The model and the engine both call
:func:`validate_leitner_rules` so the same rules are accepted everywhere.

Every numeric knob in the rule set carries a sibling ``why`` string (the human
rationale). All values are placeholders (``verified: false``) tracked in
``docs/TO_VERIFY.md`` until a human confirms them.
"""

from __future__ import annotations

import jsonschema

_RATINGS = ("AGAIN", "HARD", "GOOD", "EASY")

# A rating -> number map that also requires the sibling ``why`` string.
_RATING_NUMBERS = {
    "type": "object",
    "required": [*_RATINGS, "why"],
    "properties": {
        "AGAIN": {"type": "number"},
        "HARD": {"type": "number"},
        "GOOD": {"type": "number"},
        "EASY": {"type": "number"},
        "why": {"type": "string", "minLength": 1},
    },
    "additionalProperties": False,
}

_BOX_INTERVALS = {
    "type": "object",
    "required": ["1", "2", "3", "4", "5", "why"],
    "properties": {
        "1": {"type": "integer", "minimum": 0},
        "2": {"type": "integer", "minimum": 0},
        "3": {"type": "integer", "minimum": 0},
        "4": {"type": "integer", "minimum": 0},
        "5": {"type": "integer", "minimum": 0},
        "why": {"type": "string", "minLength": 1},
    },
    "additionalProperties": False,
}

LEITNER_SCHEMA = {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "type": "object",
    "required": [
        "max_box",
        "max_box_why",
        "box_intervals_days",
        "box_intervals_days_why",
        "rating_box_delta",
        "rating_box_delta_why",
        "rating_score",
        "rating_score_why",
        "overdue_interval_days",
        "new_cards_per_day",
        "new_cards_per_day_why",
    ],
    "properties": {
        "max_box": {"type": "integer", "minimum": 1},
        "max_box_why": {"type": "string", "minLength": 1},
        "box_intervals_days": _BOX_INTERVALS,
        "box_intervals_days_why": {"type": "string", "minLength": 1},
        "rating_box_delta": _RATING_NUMBERS,
        "rating_box_delta_why": {"type": "string", "minLength": 1},
        "rating_score": _RATING_NUMBERS,
        "rating_score_why": {"type": "string", "minLength": 1},
        "overdue_interval_days": _RATING_NUMBERS,
        "new_cards_per_day": {"type": "integer", "minimum": 1},
        "new_cards_per_day_why": {"type": "string", "minLength": 1},
        "lapse_score_penalty": {"type": "number", "minimum": 0, "maximum": 1},
        "lapse_score_penalty_why": {"type": "string", "minLength": 1},
        "version": {"type": "integer"},
        "verified": {"type": "boolean"},
        "source_note": {"type": "string"},
    },
    "additionalProperties": True,
}


class LeitnerRulesError(ValueError):
    """Raised when a Leitner rule set does not satisfy the schema."""


def validate_leitner_rules(data) -> None:
    """Validate ``data`` against :data:`LEITNER_SCHEMA`."""
    if not isinstance(data, dict):
        raise LeitnerRulesError("Leitner rules must be a JSON object.")
    try:
        jsonschema.validate(data, LEITNER_SCHEMA)
    except jsonschema.ValidationError as exc:
        path = "/".join(str(part) for part in exc.absolute_path) or "<root>"
        raise LeitnerRulesError(f"{path}: {exc.message}") from exc
