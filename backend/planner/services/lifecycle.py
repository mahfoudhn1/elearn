"""Append-only lifecycle tracking for generated study blocks."""

from __future__ import annotations

from typing import Any

from django.utils import timezone

from planner.models import PlannedSession, PlannedSessionEvent
from users.models import Student


def record_planned_session_event(
    *,
    student: Student,
    kind: str,
    planned_session: PlannedSession | None = None,
    study_session=None,
    from_state: str = "",
    to_state: str = "",
    metadata: dict[str, Any] | None = None,
    occurred_at=None,
) -> PlannedSessionEvent:
    """Write one immutable planner lifecycle event."""
    return PlannedSessionEvent.objects.create(
        student=student,
        planned_session=planned_session,
        study_session_uuid=getattr(study_session, "uuid", study_session),
        kind=kind,
        from_state=from_state,
        to_state=to_state,
        metadata=metadata or {},
        occurred_at=occurred_at or timezone.now(),
    )