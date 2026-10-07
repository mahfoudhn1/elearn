"""JSON-schema validation for item-analysis rule sets.

Pure Python (``jsonschema`` only, no Django). Every numeric knob carries a
sibling ``why`` string; all values are placeholders tracked in
``docs/TO_VERIFY.md``.
"""

from __future__ import annotations

import jsonschema

ITEM_ANALYSIS_SCHEMA = {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "type": "object",
    "required": [
        "min_responses",
        "min_responses_why",
        "too_easy_pct",
        "too_easy_pct_why",
        "too_hard_pct",
        "too_hard_pct_why",
        "low_discrimination",
        "low_discrimination_why",
        "negative_discrimination",
        "negative_discrimination_why",
        "ambiguous_distractor_pct",
        "ambiguous_distractor_pct_why",
        "top_bottom_fraction",
        "top_bottom_fraction_why",
        "calibration_min_samples",
        "calibration_min_samples_why",
    ],
    "properties": {
        "min_responses": {"type": "integer", "minimum": 1},
        "min_responses_why": {"type": "string", "minLength": 1},
        "too_easy_pct": {"type": "number", "minimum": 0, "maximum": 1},
        "too_easy_pct_why": {"type": "string", "minLength": 1},
        "too_hard_pct": {"type": "number", "minimum": 0, "maximum": 1},
        "too_hard_pct_why": {"type": "string", "minLength": 1},
        "low_discrimination": {"type": "number"},
        "low_discrimination_why": {"type": "string", "minLength": 1},
        "negative_discrimination": {"type": "number"},
        "negative_discrimination_why": {"type": "string", "minLength": 1},
        "ambiguous_distractor_pct": {"type": "number", "minimum": 0, "maximum": 1},
        "ambiguous_distractor_pct_why": {"type": "string", "minLength": 1},
        "top_bottom_fraction": {"type": "number", "exclusiveMinimum": 0, "maximum": 0.5},
        "top_bottom_fraction_why": {"type": "string", "minLength": 1},
        "calibration_min_samples": {"type": "integer", "minimum": 1},
        "calibration_min_samples_why": {"type": "string", "minLength": 1},
        "version": {"type": "integer"},
        "verified": {"type": "boolean"},
        "source_note": {"type": "string"},
    },
    "additionalProperties": True,
}


class ItemAnalysisRulesError(ValueError):
    """Raised when an item-analysis rule set does not satisfy the schema."""


def validate_item_analysis_rules(data) -> None:
    if not isinstance(data, dict):
        raise ItemAnalysisRulesError("Item-analysis rules must be a JSON object.")
    try:
        jsonschema.validate(data, ITEM_ANALYSIS_SCHEMA)
    except jsonschema.ValidationError as exc:
        path = "/".join(str(part) for part in exc.absolute_path) or "<root>"
        raise ItemAnalysisRulesError(f"{path}: {exc.message}") from exc
