"""Mastery orchestration (Phase A3).

Bridges the pure engine to the database:

* picks the active :class:`~assessment.models.MasteryRuleSet` (falling back to
  the bundled default JSON);
* converts :class:`~assessment.models.Evidence` rows into engine inputs;
* recomputes and caches :class:`~assessment.models.TopicMastery` rows (on new
  evidence, or lazily when the cache is stale / the rule version changed);
* builds chapter and subject readiness **on read** from the cached topic rows.

Nothing here is scheduled by a worker (there is no Celery in this project):
recomputation runs on the evidence write path via a signal and, defensively,
lazily whenever a mastery/readiness endpoint is read.
"""

from __future__ import annotations

import logging
from collections import defaultdict
from datetime import timedelta

from django.utils import timezone

from planner.models import Chapter, Topic

from .engine.mastery import (
    compute_topic_mastery,
    evidence_from_rows,
)
from .engine.mastery_rules import (
    MasteryConfidence,
    MasteryRules,
    load_mastery_rules,
)
from .engine.readiness import (
    ReadinessResult,
    TopicReadinessInput,
    compute_readiness,
)
from .models import Evidence, MasteryRuleSet, TopicMastery

logger = logging.getLogger(__name__)

#: The bundled rule version used when no DB rule set is active.
DEFAULT_RULES_VERSION = 1

#: How long a cached :class:`TopicMastery` row is trusted before a read
#: recomputes it. There is no background worker, so staleness is checked lazily.
STALE_AFTER = timedelta(hours=24)


def active_rules() -> MasteryRules:
    """The active DB rule set, else the bundled default (never raises)."""
    ruleset = (
        MasteryRuleSet.objects.filter(is_active=True).order_by("-version").first()
    )
    if ruleset is None:
        return load_mastery_rules()
    try:
        return MasteryRules.from_dict(ruleset.json)
    except Exception:  # noqa: BLE001 - a bad row must not break reads
        logger.exception("invalid active MasteryRuleSet %s; using bundled default", ruleset.pk)
        return load_mastery_rules()


def active_rules_meta() -> tuple[MasteryRules, int]:
    """Return ``(rules, version)`` for the active rule set."""
    ruleset = (
        MasteryRuleSet.objects.filter(is_active=True).order_by("-version").first()
    )
    if ruleset is None:
        return load_mastery_rules(), DEFAULT_RULES_VERSION
    try:
        return MasteryRules.from_dict(ruleset.json), int(ruleset.version)
    except Exception:  # noqa: BLE001
        logger.exception("invalid active MasteryRuleSet %s; using bundled default", ruleset.pk)
        return load_mastery_rules(), DEFAULT_RULES_VERSION


def _topic_evidence(student, topic) -> list[Evidence]:
    return list(
        Evidence.objects.filter(student=student, topic=topic).only(
            "score",
            "difficulty",
            "occurred_at",
            "source",
            "question_id",
            "weight_modifier",
        )
    )


def recompute_topic_mastery(
    student,
    topic,
    *,
    rules: MasteryRules | None = None,
    rules_version: int | None = None,
    now=None,
) -> TopicMastery:
    """Recompute and persist the cached mastery for one (student, topic).

    Returns the saved :class:`TopicMastery` row. The result is always an
    overwrite (never an increment), so it is safe to call repeatedly.
    """
    now = now or timezone.now()
    if rules is None:
        rules, resolved_version = active_rules_meta()
        rules_version = resolved_version if rules_version is None else rules_version
    elif rules_version is None:
        rules_version = int(getattr(rules, "version", DEFAULT_RULES_VERSION))

    evidence = _topic_evidence(student, topic)
    result = compute_topic_mastery(evidence_from_rows(evidence), rules, now)

    return TopicMastery.objects.update_or_create(
        student=student,
        topic=topic,
        defaults={
            "mastery": result.mastery,
            "confidence": result.confidence,
            "trend": result.trend,
            "effective_weight": result.effective_weight,
            "evidence_count": result.evidence_count,
            "last_evidence_at": result.last_evidence_at,
            "computed_at": now,
            "rules_version": rules_version,
            "reasons": [
                {"code": reason.code, "params": dict(reason.params)}
                for reason in result.reasons
            ],
        },
    )[0]


def recompute_for_topics(student, topics) -> list[TopicMastery]:
    """Recompute mastery for several topics with one shared rule set."""
    rules, version = active_rules_meta()
    now = timezone.now()
    return [
        recompute_topic_mastery(
            student, topic, rules=rules, rules_version=version, now=now
        )
        for topic in topics
    ]


def is_stale(entry: TopicMastery, *, rules_version: int | None = None, now=None) -> bool:
    now = now or timezone.now()
    if rules_version is not None and entry.rules_version != rules_version:
        return True
    if entry.computed_at is None:
        return True
    return now - entry.computed_at > STALE_AFTER


def ensure_topic_mastery(student, topics, *, force: bool = False):
    """Return up-to-date :class:`TopicMastery` rows for ``topics``.

    Recomputes only the rows that are missing, stale or produced by a different
    rule version, so a plain read is cheap.
    """
    topic_list = list(topics)
    if not topic_list:
        return []

    rules, version = active_rules_meta()
    existing = {
        entry.topic_id: entry
        for entry in TopicMastery.objects.filter(student=student, topic__in=topic_list)
    }

    results: list[TopicMastery] = []
    recomputed = False
    now = timezone.now()
    for topic in topic_list:
        entry = existing.get(topic.id)
        if force or entry is None or is_stale(entry, rules_version=version, now=now):
            entry = recompute_topic_mastery(
                student,
                topic,
                rules=rules,
                rules_version=version,
                now=now,
            )
            recomputed = True
        results.append(entry)
    return results


# --- readiness (computed on read) --------------------------------------------


def _topic_rows_by_subject(student):
    """``subject -> [Topic]`` for every topic with evidence in this class.

    Scoped by the subjects the student actually has evidence on, so readiness
    never invents coverage for untouched subjects.
    """
    rows = (
        Evidence.objects.filter(student=student)
        .values_list("topic__chapter__subject", "topic_id")
        .distinct()
    )
    by_subject: dict[str, set[int]] = defaultdict(set)
    for subject, topic_id in rows:
        by_subject[subject].add(topic_id)
    topic_ids = {tid for ids in by_subject.values() for tid in ids}
    topics = {topic.id: topic for topic in Topic.objects.filter(id__in=topic_ids)}
    return by_subject, topics


def topic_mastery_inputs(student, topics) -> list[TopicReadinessInput]:
    entries = ensure_topic_mastery(student, topics)
    by_id = {entry.topic_id: entry for entry in entries}
    inputs: list[TopicReadinessInput] = []
    for topic in topics:
        entry = by_id.get(topic.id)
        inputs.append(
            TopicReadinessInput(
                topic_id=str(topic.uuid),
                mastery=entry.mastery if entry else None,
                confidence=entry.confidence if entry else MasteryConfidence.NONE,
                has_evidence=bool(entry and entry.evidence_count > 0),
            )
        )
    return inputs


def compute_chapter_result(student, chapter: Chapter, *, rules: MasteryRules | None = None) -> ReadinessResult:
    rules = rules or active_rules()
    topics = list(chapter.topics.all())
    inputs = topic_mastery_inputs(student, topics)
    # ``Chapter.weight`` is the per-chapter coefficient; apply it uniformly to
    # its topics so a heavier chapter contributes more to a subject rollup.
    weights = {item.topic_id: float(chapter.weight or 1.0) for item in inputs}
    return compute_readiness(
        _apply_weights(inputs, weights), rules, scope="chapter"
    )


def compute_subject_result(student, subject: str, *, rules: MasteryRules | None = None) -> ReadinessResult:
    rules = rules or active_rules()
    topics = list(Topic.objects.filter(chapter__subject=subject))
    inputs = topic_mastery_inputs(student, topics)
    # Topic weight = its chapter's weight (default 1.0 when unset/zero).
    chapter_weights = {
        chapter_id: float(weight or 1.0)
        for chapter_id, weight in Chapter.objects.filter(subject=subject).values_list(
            "id", "weight"
        )
    }
    weights = {
        item.topic_id: chapter_weights.get(topic.chapter_id, 1.0)
        for item, topic in zip(inputs, topics)
    }
    return compute_readiness(_apply_weights(inputs, weights), rules, scope="subject")


def _apply_weights(
    inputs: list[TopicReadinessInput], weights: dict[str, float]
) -> list[TopicReadinessInput]:
    return [
        TopicReadinessInput(
            topic_id=item.topic_id,
            mastery=item.mastery,
            confidence=item.confidence,
            has_evidence=item.has_evidence,
            weight=float(weights.get(item.topic_id, item.weight)),
        )
        for item in inputs
    ]


def subjects_with_evidence(student) -> list[str]:
    return sorted(
        {
            subject
            for subject, _ids in _topic_rows_by_subject(student)[0].items()
            if subject
        }
    )


def overview(student, *, rules: MasteryRules | None = None) -> list[dict]:
    """Readiness for every subject the student has evidence on."""
    rules = rules or active_rules()
    by_subject, topics_by_id = _topic_rows_by_subject(student)
    out: list[dict] = []
    for subject in sorted(by_subject):
        topic_ids = sorted(by_subject[subject])
        topics = [topics_by_id[tid] for tid in topic_ids if tid in topics_by_id]
        inputs = topic_mastery_inputs(student, topics)
        chapter_weights = {
            chapter_id: float(weight or 1.0)
            for chapter_id, weight in Chapter.objects.filter(
                id__in={topic.chapter_id for topic in topics}
            ).values_list("id", "weight")
        }
        weights = {
            item.topic_id: chapter_weights.get(topic.chapter_id, 1.0)
            for item, topic in zip(inputs, topics)
        }
        result = compute_readiness(
            _apply_weights(inputs, weights), rules, scope="subject"
        )
        out.append({"subject": subject, **_readiness_dict(result)})
    return out


def _readiness_dict(result: ReadinessResult) -> dict:
    return {
        "value": result.value,
        "band": result.band,
        "coverage": result.coverage,
        "topics_with_evidence": result.topics_with_evidence,
        "topics_total": result.topics_total,
        "confidence": result.confidence,
        "reasons": [
            {"code": reason.code, "params": dict(reason.params)}
            for reason in result.reasons
        ],
    }


def topic_mastery_dict(entry: TopicMastery) -> dict:
    return {
        "topic": str(entry.topic.uuid),
        "mastery": entry.mastery,
        "confidence": entry.confidence,
        "trend": entry.trend,
        "effective_weight": entry.effective_weight,
        "evidence_count": entry.evidence_count,
        "last_evidence_at": entry.last_evidence_at,
        "computed_at": entry.computed_at,
        "rules_version": entry.rules_version,
        "reasons": entry.reasons,
    }
