"""Serialise pure-engine DTOs to plain JSON (for dry-run/admin tooling)."""

from __future__ import annotations


def serialize_reasons(reasons) -> list[dict]:
    return [{"code": reason.code, "params": dict(reason.params)} for reason in reasons]


def serialize_busy_blocks(blocks) -> list[dict]:
    return [
        {
            "date": block.date.isoformat(),
            "start_min": block.start_min,
            "end_min": block.end_min,
            "kind": block.kind,
            "source": block.source,
            "source_id": block.source_id,
            "subject_id": block.subject_id,
            "activity_type": block.activity_type,
            "movable": block.movable,
            "counts_as_study_credit": block.counts_as_study_credit,
        }
        for block in blocks
    ]


def serialize_free_intervals(intervals) -> list[dict]:
    return [
        {"date": interval.date.isoformat(), "start_min": interval.start_min, "end_min": interval.end_min}
        for interval in intervals
    ]


def serialize_engine_output(output) -> dict:
    return {
        "sessions": [
            {
                "date": session.date.isoformat(),
                "start_min": session.start_min,
                "end_min": session.end_min,
                "subject_id": session.subject_id,
                "activity_type": session.activity_type,
                "reasons": serialize_reasons(session.reasons),
                "source_demand_ids": list(session.source_demand_ids),
            }
            for session in output.sessions
        ],
        "unmet": [
            {
                "subject_id": item.subject_id,
                "activity_type": item.activity_type,
                "minutes": item.minutes,
                "due_by": item.due_by.isoformat() if item.due_by else None,
                "derived_from": item.derived_from,
                "reasons": serialize_reasons(item.reasons),
            }
            for item in output.unmet
        ],
        "diagnostics": {str(key): value for key, value in output.diagnostics.items()},
    }
