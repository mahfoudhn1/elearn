"""Signal hooks that request a replan when planner inputs change.

Generation is deferred to ``transaction.on_commit`` and debounced in
``replan_service``; failures are logged rather than breaking the originating
save.
"""

from __future__ import annotations

import logging

from django.db import transaction
from django.db.models.signals import post_save
from django.dispatch import receiver

from planner.models import Commitment, CommitmentException, PlannerExam
from planner.services import replan_service

logger = logging.getLogger(__name__)


def _schedule(student, trigger) -> None:
    if student is None:
        return

    def _run():
        try:
            replan_service.request_replan(student, trigger)
        except Exception:  # noqa: BLE001 - never break the originating save
            logger.exception("planner replan failed (trigger=%s)", trigger)

    transaction.on_commit(_run)


@receiver(post_save, sender=Commitment)
def _commitment_saved(sender, instance, **kwargs):
    _schedule(instance.student, replan_service.ReplanTrigger.COMMITMENT)


@receiver(post_save, sender=CommitmentException)
def _commitment_exception_saved(sender, instance, **kwargs):
    _schedule(instance.commitment.student, replan_service.ReplanTrigger.COMMITMENT)


@receiver(post_save, sender=PlannerExam)
def _planner_exam_saved(sender, instance, **kwargs):
    _schedule(instance.student, replan_service.ReplanTrigger.EXAM)
