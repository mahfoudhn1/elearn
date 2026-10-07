"""Signal hooks that refresh cached mastery when evidence changes.

There is no background worker in this project, so a new :class:`Evidence` row
triggers a recompute of that (student, topic) mastery in
``transaction.on_commit``. Failures are logged rather than breaking the
originating save; a stale cache is also healed lazily on read (see
``assessment.services_mastery``).
"""

from __future__ import annotations

import logging

from django.db import transaction
from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import Evidence
from .services_mastery import recompute_topic_mastery

logger = logging.getLogger(__name__)


@receiver(post_save, sender=Evidence)
def _evidence_saved(sender, instance, **kwargs):
    student = instance.student
    topic = instance.topic

    def _run():
        try:
            recompute_topic_mastery(student, topic)
        except Exception:  # noqa: BLE001 - never break the originating save
            logger.exception(
                "mastery recompute failed for student=%s topic=%s",
                student.pk,
                topic.pk,
            )

    transaction.on_commit(_run)
