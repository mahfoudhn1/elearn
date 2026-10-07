"""Mastery-change detection and planner replan trigger (Phase A7).

When an attempt is submitted or a flashcard batch is reviewed, a topic's cached
mastery may cross into a different confidence band. If so we ask the planner to
regenerate (``ReplanTrigger.MASTERY``); the existing debounce and override
contract (locked / student-origin sessions untouched, tombstones respected) apply
automatically in ``planner.services.replan_service``.

Kept out of the pure engine and off the request-critical path: replanning is
deferred to ``transaction.on_commit`` and is best-effort.
"""

from __future__ import annotations

import logging

from django.db import transaction

from planner.services import replan_service

logger = logging.getLogger(__name__)

#: Replan only when a topic's confidence band changes at least this much.
_BAND_ORDER = {"NONE": 0, "LOW": 1, "MEDIUM": 2, "HIGH": 3}


def band_changed(before: str | None, after: str | None) -> bool:
    """True when the confidence band moved between ``before`` and ``after``."""
    return _BAND_ORDER.get(after or "NONE", 0) != _BAND_ORDER.get(before or "NONE", 0)


def confidence_snapshot(student, topic_ids) -> dict[str, str]:
    """``topic_id -> confidence`` for the given topics (for before/after checks)."""
    from assessment.models import TopicMastery

    return {
        str(row["topic__uuid"]): row["confidence"]
        for row in TopicMastery.objects.filter(
            student=student, topic__uuid__in=list(topic_ids)
        ).values("topic__uuid", "confidence")
    }


def request_mastery_replan(student, *, before: dict[str, str], topic_ids) -> bool:
    """Replan if any topic's confidence band changed. Returns True when asked.

    Must be called *before* the DB transaction commits (it registers an
    ``on_commit`` callback) so the replan sees the new mastery rows.
    """
    def _run():
        try:
            after = confidence_snapshot(student, topic_ids)
            changed = any(
                band_changed(before.get(topic_id), after.get(topic_id))
                for topic_id in set(before) | set(after)
            )
            if changed:
                replan_service.request_replan(
                    student, replan_service.ReplanTrigger.MASTERY
                )
        except Exception:  # noqa: BLE001 - replanning is best-effort
            logger.exception("mastery replan trigger failed for student %s", student.pk)

    transaction.on_commit(_run)
    return True