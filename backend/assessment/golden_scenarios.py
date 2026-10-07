"""Deterministic golden scenarios for the assessment stack (Phase A10).

Each scenario builds a small, fixed input and returns a JSON-serialisable
snapshot of what the pure engines (and, for the last one, the planner engine)
produce. They are committed under ``tests/golden/assessment_scenarios.json`` and
compared by ``tests_golden_scenarios.py``, so a behavioural change shows up as a
diff.

Scenarios: new student, strong student, misconceptions, repeated retakes, thin
question bank, and a weak student in a LIGHT subject (mastery still tracked while
planner time is capped).
"""

from __future__ import annotations

from datetime import date, datetime, timedelta, timezone

from .engine import (
    AdaptiveCandidate,
    AdaptiveState,
    EvidenceInput,
    ItemResponse,
    analyse_item,
    compute_topic_mastery,
    load_item_analysis_rules,
    load_mastery_rules,
    select_next_question,
)
from .engine.item_analysis import FLAG_AMBIGUOUS_DISTRACTOR

NOW = datetime(2099, 1, 15, 9, 0, tzinfo=timezone.utc)


def _topic_result(evidence):
    rules = load_mastery_rules()
    result = compute_topic_mastery(evidence, rules, NOW)
    return {
        "mastery": result.mastery,
        "confidence": result.confidence,
        "trend": result.trend,
        "effective_weight": round(result.effective_weight, 6),
        "evidence_count": result.evidence_count,
        "reason_codes": [reason.code for reason in result.reasons],
    }


def scenario_new_student() -> dict:
    """No evidence yet: no mastery, no confidence, no number."""
    return {"mastery": _topic_result([])}


def scenario_strong_student() -> dict:
    """Several hard questions answered correctly across distinct days."""
    evidence = [
        EvidenceInput(1.0, 5, NOW - timedelta(days=day), question_ref=f"q{day}")
        for day in (1, 2, 3, 5, 8)
    ]
    return {"mastery": _topic_result(evidence)}


def scenario_misconceptions() -> dict:
    """A question whose wrong option is chosen by many students."""
    responses = [
        ItemResponse(f"s{i}", i < 6, "A" if i < 6 else "B", total_score=10 - i)
        for i in range(12)
    ]
    result = analyse_item(
        responses, load_item_analysis_rules(), correct_option_id="A"
    )
    return {
        "attempts": result.attempts,
        "pct_correct": result.pct_correct,
        "discrimination": result.discrimination,
        "option_distribution": dict(result.option_distribution),
        "flags": [flag.code for flag in result.flags],
        "has_ambiguous_distractor": FLAG_AMBIGUOUS_DISTRACTOR
        in {flag.code for flag in result.flags},
    }


def scenario_repeated_retakes() -> dict:
    """41 retakes of one question inside the window: capped weight."""
    evidence = [
        EvidenceInput(1.0, 1, NOW - timedelta(hours=index), question_ref="same")
        for index in range(41)
    ]
    return {"mastery": _topic_result(evidence)}


def scenario_thin_question_bank() -> dict:
    """A topic with fewer questions than the per-topic quota."""
    from .engine import load_adaptive_rules

    candidates = [
        AdaptiveCandidate("q1", "t1", 2),
        AdaptiveCandidate("q2", "t1", 2),
        AdaptiveCandidate("q3", "t2", 2),  # t2 has only one question
    ]
    decision = select_next_question(
        AdaptiveState(topic_order=("t1", "t2")),
        candidates,
        load_adaptive_rules(),
        seed=1,
    )
    return {
        "first_question": decision.question_id,
        "insufficient_topics": list(decision.insufficient_topics),
    }


def scenario_light_weak_topic() -> dict:
    """A weak topic in a LIGHT subject: mastery is tracked, planner time capped."""
    from planner.engine import (
        DemandWindow,
        HistorySummary,
        StudentState,
        SubjectState,
        compute_demand,
        load_pedagogy_rules,
    )
    from planner.engine.demand import MasteryTopicSummary

    subject = "رياضيات"
    evidence = [
        EvidenceInput(1.0, 3, NOW - timedelta(days=1), question_ref="a"),
        EvidenceInput(1.0, 3, NOW - timedelta(days=2), question_ref="b"),
        EvidenceInput(0.0, 3, NOW - timedelta(days=3), question_ref="c"),
    ]
    mastery = _topic_result(evidence)

    rules = load_pedagogy_rules()
    window = DemandWindow(date(2099, 1, 15), date(2099, 1, 21))
    state = StudentState(
        level="default",
        subjects=(
            SubjectState(
                subject_id=subject,
                confidence="WEAK",
                coefficient=5.0,
                tier="LIGHT",
            ),
        ),
    )
    summary = {
        "t1": MasteryTopicSummary(
            topic_id="t1", subject_id=subject, mastery=0.2, confidence="HIGH"
        )
    }
    units = compute_demand(
        state, [], HistorySummary(), rules, window, date(2099, 1, 15), summary
    )
    topic_units = [unit for unit in units if unit.topic_id == "t1"]
    return {
        "mastery_tracked": mastery,
        "topic_review_minutes": [u.minutes for u in topic_units],
        "light_ceiling_weekly": rules.weekly_minutes_ceiling("LIGHT"),
        "capped_within_ceiling": all(
            u.minutes <= rules.weekly_minutes_ceiling("LIGHT")
            for u in topic_units
        ),
    }


SCENARIOS = {
    "new_student": scenario_new_student,
    "strong_student": scenario_strong_student,
    "misconceptions": scenario_misconceptions,
    "repeated_retakes": scenario_repeated_retakes,
    "thin_question_bank": scenario_thin_question_bank,
    "light_weak_topic": scenario_light_weak_topic,
}


def all_scenarios() -> dict:
    return {name: builder() for name, builder in SCENARIOS.items()}


__all__ = ["all_scenarios", "SCENARIOS"]
