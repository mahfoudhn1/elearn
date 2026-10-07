"""Subject planning modes + importance (Phase A6 helpers).

Builds the per-subject planning view (tier, mode, reasons) and applies mode
updates. Kept separate from the pure engine: this module is the DB-facing
bridge, while ``planner.engine.tiers`` and ``planner.engine.demand`` hold the
pure logic.
"""

from __future__ import annotations

from planner.engine.demand import MODE_MORE, MODE_TRACKING_ONLY
from planner.engine.pedagogy import load_pedagogy_rules
from planner.engine.tiers import (
    REASON_IMPORTANCE_UNKNOWN,
    raise_tier,
    resolve_tier,
)
from planner.models import (
    PlannerExam,
    SubjectConfidence,
    SubjectPlanningMode,
)

from .adapters.demand_inputs import (
    _coefficient,
    _importance,
    _level_for,
    _load_importances,
    _load_subject_configs,
    _planning_modes,
)


def _reasons(codes_params) -> list[dict]:
    return [{"code": code, "params": params} for code, params in codes_params]


def subject_planning_state(student) -> dict:
    """Return every subject the student engages with, its tier and mode.

    Subjects come from the student's confidences and exams. Each row carries the
    resolved tier, the coefficient (may be ``None``), whether importance is
    known, the planning mode, and structured reasons.
    """
    level = _level_for(student)
    stream = getattr(getattr(student, "field_of_study", None), "name", "") or ""
    configs = _load_subject_configs()
    importances = _load_importances()
    modes = _planning_modes(student)
    thresholds = load_pedagogy_rules().tier_thresholds

    names: set[str] = set()
    for confidence in SubjectConfidence.objects.filter(student=student):
        names.add(confidence.subject)
    for exam in PlannerExam.objects.filter(student=student):
        names.add(exam.subject)

    rows = []
    for subject in sorted(names):
        importance = _importance(importances, subject, level, stream)
        if importance is not None and importance.coefficient is not None:
            coefficient = float(importance.coefficient)
        else:
            coefficient = _coefficient(configs, subject, level, stream)

        tier, known = resolve_tier(coefficient, thresholds)
        mode = modes.get(subject, SubjectPlanningMode.Mode.AUTO)

        reasons: list[tuple[str, dict]] = []
        if not known:
            reasons.append((REASON_IMPORTANCE_UNKNOWN, {"subject": subject, "tier": tier}))
        if mode == MODE_MORE:
            reasons.append(
                (
                    "MODE_MORE",
                    {"tier": tier, "raised_tier": raise_tier(tier)},
                )
            )
        elif mode == MODE_TRACKING_ONLY:
            reasons.append(("MODE_TRACKING_ONLY", {"subject": subject}))

        rows.append(
            {
                "subject": subject,
                "tier": tier,
                "coefficient": coefficient,
                "coefficient_known": known,
                "mode": mode,
                "verified": bool(importance.verified) if importance else False,
                "reasons": _reasons(reasons),
            }
        )
    return {
        "level": level,
        "stream": stream,
        "subjects": rows,
    }


def apply_subject_planning(student, modes: dict[str, str]) -> dict:
    """Upsert planning modes for ``student`` and return the new state.

    ``modes`` maps ``subject -> AUTO|MORE|TRACKING_ONLY``. Subjects omitted keep
    their existing mode.
    """
    for subject, mode in modes.items():
        SubjectPlanningMode.objects.update_or_create(
            student=student,
            subject=subject,
            defaults={"mode": mode},
        )
    return subject_planning_state(student)