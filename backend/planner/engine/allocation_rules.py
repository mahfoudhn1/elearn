"""Allocation weights/rationale for priority tiering and soft scoring.

Pure Python. Values are placeholders (``verified=false`` in the JSON rule file)
and each weight carries a human-readable ``why``.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Mapping


@dataclass(frozen=True)
class PriorityWeights:
    exam_urgent: float
    expiring_followup: float
    deficit: float
    exam_urgency_days: int
    followup_urgency_days: int
    rationale: Mapping[str, str]

    @classmethod
    def from_dict(cls, data: Mapping) -> "PriorityWeights":
        default = cls.default()
        return cls(
            exam_urgent=float(data.get("exam_urgent", default.exam_urgent)),
            expiring_followup=float(data.get("expiring_followup", default.expiring_followup)),
            deficit=float(data.get("deficit", default.deficit)),
            exam_urgency_days=int(data.get("exam_urgency_days", default.exam_urgency_days)),
            followup_urgency_days=int(
                data.get("followup_urgency_days", default.followup_urgency_days)
            ),
            rationale=dict(data.get("rationale", default.rationale)),
        )

    @classmethod
    def default(cls) -> "PriorityWeights":
        return cls(
            exam_urgent=3.0,
            expiring_followup=2.0,
            deficit=1.0,
            exam_urgency_days=7,
            followup_urgency_days=2,
            rationale={
                "exam_urgent": "PLACEHOLDER: demand for subjects with an exam soon comes first",
                "expiring_followup": "PLACEHOLDER: follow-ups whose window is closing come next",
                "deficit": "PLACEHOLDER: then rank by how far behind the student is",
            },
        )


@dataclass(frozen=True)
class SoftWeights:
    preferred_period: float
    spread_across_days: float
    hard_subject_spacing: float
    lesson_proximity: float
    length_fit: float
    topic_recency: float
    rationale: Mapping[str, str]

    @classmethod
    def from_dict(cls, data: Mapping) -> "SoftWeights":
        default = cls.default()
        return cls(
            preferred_period=float(data.get("preferred_period", default.preferred_period)),
            spread_across_days=float(data.get("spread_across_days", default.spread_across_days)),
            hard_subject_spacing=float(
                data.get("hard_subject_spacing", default.hard_subject_spacing)
            ),
            lesson_proximity=float(data.get("lesson_proximity", default.lesson_proximity)),
            length_fit=float(data.get("length_fit", default.length_fit)),
            topic_recency=float(data.get("topic_recency", default.topic_recency)),
            rationale=dict(data.get("rationale", default.rationale)),
        )

    @classmethod
    def default(cls) -> "SoftWeights":
        return cls(
            preferred_period=1.0,
            spread_across_days=1.0,
            hard_subject_spacing=0.8,
            lesson_proximity=0.6,
            length_fit=0.4,
            topic_recency=0.7,
            rationale={
                "preferred_period": "PLACEHOLDER: match the student's preferred time of day",
                "spread_across_days": "PLACEHOLDER: fill the emptiest days first",
                "hard_subject_spacing": "PLACEHOLDER: avoid stacking the same subject back-to-back",
                "lesson_proximity": "PLACEHOLDER: put a lesson's follow-up near the lesson",
                "length_fit": "PLACEHOLDER: prefer full-length sessions over scraps",
                "topic_recency": "PLACEHOLDER: prefer topics a recent lesson covered",
            },
        )


@dataclass(frozen=True)
class AllocationWeights:
    priority: PriorityWeights
    soft: SoftWeights
    session_length_by_preference: Mapping[str, int]
    completion_factor: float
    min_session_minutes: int
    max_session_minutes: int
    min_break_minutes: int
    hard_subject_spacing_days: int
    lesson_proximity_days: int
    topic_recency_days: int
    band_boundaries: Mapping[str, int]

    @classmethod
    def default(cls) -> "AllocationWeights":
        return cls(
            priority=PriorityWeights.default(),
            soft=SoftWeights.default(),
            session_length_by_preference={
                "SHORT": 25,
                "MEDIUM": 45,
                "LONG": 60,
                "NONE": 40,
            },
            completion_factor=1.0,
            min_session_minutes=15,
            max_session_minutes=60,
            min_break_minutes=10,
            hard_subject_spacing_days=1,
            lesson_proximity_days=3,
            topic_recency_days=7,
            band_boundaries={
                "morning_start": 300,
                "afternoon_start": 720,
                "evening_start": 1020,
                "night_start": 1380,
            },
        )

    @classmethod
    def from_dict(cls, data: Mapping) -> "AllocationWeights":
        default = cls.default()
        lengths = dict(default.session_length_by_preference)
        lengths.update(
            {str(k): int(v) for k, v in data.get("session_length_by_preference", {}).items()}
        )
        boundaries = dict(default.band_boundaries)
        boundaries.update(
            {str(k): int(v) for k, v in data.get("band_boundaries", {}).items()}
        )
        return cls(
            priority=PriorityWeights.from_dict(data.get("priority", {})),
            soft=SoftWeights.from_dict(data.get("soft", {})),
            session_length_by_preference=lengths,
            completion_factor=float(data.get("completion_factor", default.completion_factor)),
            min_session_minutes=int(data.get("min_session_minutes", default.min_session_minutes)),
            max_session_minutes=int(data.get("max_session_minutes", default.max_session_minutes)),
            min_break_minutes=int(data.get("min_break_minutes", default.min_break_minutes)),
            hard_subject_spacing_days=int(
                data.get("hard_subject_spacing_days", default.hard_subject_spacing_days)
            ),
            lesson_proximity_days=int(
                data.get("lesson_proximity_days", default.lesson_proximity_days)
            ),
            topic_recency_days=int(data.get("topic_recency_days", default.topic_recency_days)),
            band_boundaries=boundaries,
        )
