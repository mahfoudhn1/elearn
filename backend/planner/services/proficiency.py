"""Persist score-derived subject proficiency and its calculation provenance."""

from __future__ import annotations

from decimal import Decimal, ROUND_HALF_UP
from typing import Any, Iterable

from django.utils import timezone

from planner.engine.proficiency import proficiency_level
from assessment.models import Evidence
from planner.models import SubjectProficiency
from users.models import Student

# Latest evidence receives the largest linear rank weight; at most 100 rows
# participate so the policy remains bounded and reproducible.
SUBJECT_EVIDENCE_LIMIT = 100
SUBJECT_PROFICIENCY_CALCULATION_VERSION = "recent-evidence-linear-100-v1"


def record_subject_proficiency(
    student: Student,
    subject: str,
    score: int,
    *,
    calculation_version: str,
    evidence: Iterable[dict[str, Any]],
    computed_at=None,
) -> SubjectProficiency:
    """Store a supplied score and exactly which evidence fed its calculation.

    The quiz/flashcard aggregation policy is intentionally supplied by the
    caller rather than silently inferred here.
    """
    level = proficiency_level(score)
    evidence_snapshot = list(evidence)
    row, _created = SubjectProficiency.objects.update_or_create(
        student=student,
        subject=subject,
        defaults={
            "score": score,
            "level": level,
            "calculation_version": calculation_version,
            "evidence_count": len(evidence_snapshot),
            "evidence_snapshot": evidence_snapshot,
            "computed_at": computed_at or timezone.now(),
        },
    )
    return row


def recompute_subject_proficiency(
    student: Student,
    subject: str,
    *,
    computed_at=None,
) -> SubjectProficiency | None:
    """Compute a recent-weighted subject mean from all normalized Evidence.

    Evidence scores are stored on a 0..1 scale. Rows are ranked newest-first
    with weights N, N-1, ..., 1; sources are included uniformly and explicitly
    retained in the provenance snapshot.
    """
    rows = list(
        Evidence.objects.filter(
            student=student,
            topic__chapter__subject=subject,
        )
        .select_related("topic__chapter")
        .only(
            "uuid",
            "source",
            "source_ref_type",
            "source_ref_id",
            "score",
            "occurred_at",
            "topic__chapter__subject",
        )
        .order_by("-occurred_at", "-pk")[:SUBJECT_EVIDENCE_LIMIT]
    )
    if not rows:
        return None

    total_weight = sum(range(len(rows), 0, -1))
    weighted_score = sum(
        (Decimal(row.score) * Decimal(len(rows) - index))
        for index, row in enumerate(rows)
    )
    score = int(
        (weighted_score / Decimal(total_weight) * Decimal(100)).quantize(
            Decimal("1"), rounding=ROUND_HALF_UP
        )
    )
    evidence_snapshot = [
        {
            "id": str(row.uuid),
            "source": row.source,
            "source_ref_type": row.source_ref_type,
            "source_ref_id": row.source_ref_id,
            "score": str(row.score),
            "occurred_at": row.occurred_at.isoformat(),
            "weight": len(rows) - index,
        }
        for index, row in enumerate(rows)
    ]
    return record_subject_proficiency(
        student,
        subject,
        score,
        calculation_version=SUBJECT_PROFICIENCY_CALCULATION_VERSION,
        evidence=evidence_snapshot,
        computed_at=computed_at,
    )