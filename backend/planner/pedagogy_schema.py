"""JSON-schema validation for pedagogy rule sets.

Pure Python (jsonschema only, no Django). The model and the engine both call
:func:`validate_pedagogy_rules` so the same rules are accepted everywhere.
"""

from __future__ import annotations

import jsonschema

_OBJ_OF_NUMBERS = {"type": "object", "additionalProperties": {"type": "number"}}
_OBJ_OF_INTEGERS = {"type": "object", "additionalProperties": {"type": "integer", "minimum": 0}}

_SESSION_LENGTH = {
    "type": "object",
    "required": ["min", "default", "max"],
    "properties": {
        "min": {"type": "integer", "minimum": 1},
        "default": {"type": "integer", "minimum": 1},
        "max": {"type": "integer", "minimum": 1},
    },
    "additionalProperties": False,
}

_FOLLOWUP_CHAIN = {
    "type": "object",
    "required": ["source", "target"],
    "properties": {
        "source": {"type": "string", "minLength": 1},
        "target": {"type": "string", "minLength": 1},
        "within_hours": {"type": "integer", "minimum": 1},
        "within_days": {"type": "integer", "minimum": 1},
    },
    "additionalProperties": False,
}

_PRIORITY_WEIGHT = {
    "type": "object",
    "required": ["weight", "why"],
    "properties": {
        "weight": {"type": "number"},
        "why": {"type": "string", "minLength": 1},
    },
    "additionalProperties": False,
}

PEDAGOGY_SCHEMA = {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "type": "object",
    "required": [
        "weekly_target_minutes_by_level_subject",
        "importance_from_coefficient",
        "instruction_credit_ratios",
        "activity_type_session_length",
        "followup_chains",
        "exam_boost_curve",
        "weakness_multipliers",
        "deficit_carryover_cap",
        "daily_capacity_ratio_table",
        "min_break_minutes",
        "max_consecutive_hard_subjects",
        "max_demand_minutes_per_subject",
        "priority_weights",
    ],
    "properties": {
        "weekly_target_minutes_by_level_subject": {
            "type": "object",
            "additionalProperties": _OBJ_OF_INTEGERS,
        },
        "importance_from_coefficient": _OBJ_OF_NUMBERS,
        "instruction_credit_ratios": _OBJ_OF_NUMBERS,
        "activity_type_session_length": {
            "type": "object",
            "additionalProperties": _SESSION_LENGTH,
        },
        "followup_chains": {"type": "array", "items": _FOLLOWUP_CHAIN},
        "exam_boost_curve": _OBJ_OF_NUMBERS,
        "weakness_multipliers": _OBJ_OF_NUMBERS,
        "deficit_carryover_cap": {"type": "integer", "minimum": 0},
        "daily_capacity_ratio_table": _OBJ_OF_NUMBERS,
        "min_break_minutes": {"type": "integer", "minimum": 0},
        "max_consecutive_hard_subjects": {"type": "integer", "minimum": 1},
        "max_demand_minutes_per_subject": {"type": "integer", "minimum": 1},
        "priority_weights": {
            "type": "object",
            "additionalProperties": _PRIORITY_WEIGHT,
        },
        "history": {
            "type": "object",
            "properties": {
                "lookback_days": {"type": "integer", "minimum": 1},
                "min_samples": {"type": "integer", "minimum": 1},
                "length_factor_floor": {"type": "number"},
                "length_factor_ceil": {"type": "number"},
                "band_penalty_weight": {"type": "number"},
                "done_threshold_ratio": {"type": "number"},
                "partial_threshold_ratio": {"type": "number"},
                "replan_debounce_minutes": {"type": "integer", "minimum": 0},
            },
            "additionalProperties": False,
        },
        "version": {"type": "integer"},
        "verified": {"type": "boolean"},
        "source_note": {"type": "string"},
    },
    "additionalProperties": True,
}


class PedagogyRulesError(ValueError):
    """Raised when a pedagogy rule set does not satisfy the schema."""


def validate_pedagogy_rules(data) -> None:
    """Validate ``data`` against :data:`PEDAGOGY_SCHEMA`."""
    if not isinstance(data, dict):
        raise PedagogyRulesError("Pedagogy rules must be a JSON object.")
    try:
        jsonschema.validate(data, PEDAGOGY_SCHEMA)
    except jsonschema.ValidationError as exc:
        path = "/".join(str(part) for part in exc.absolute_path) or "<root>"
        raise PedagogyRulesError(f"{path}: {exc.message}") from exc
