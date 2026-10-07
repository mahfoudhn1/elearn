"""Pure adaptive-diagnostic selector (no Django, no DB, no clock).

``select_next_question(state, candidates, rules, seed)`` chooses the next
question for a diagnostic session, or signals STOP with a reason code. It is
deterministic: the result depends only on the state, the candidate set, the
rules and the seed.

Selection policy
----------------
1. **Coverage first** -- every topic should reach ``min_questions_per_topic``.
   Topics below that quota are served in a stable round-robin order.
2. **Difficulty staircase per topic** -- a topic's target starts at
   ``start_difficulty`` and moves up ``difficulty_step`` after a correct answer,
   down after a wrong one, clamped to ``[difficulty_min, difficulty_max]`` and to
   the difficulties that actually exist for that topic.
3. **Skip recent** -- questions in ``state.recently_seen_ids`` are never picked
   (the caller fills this from the student's recent history).
4. **Prefer untested misconceptions** -- when several questions fit, one that
   exercises a misconception not yet tested scores higher.
5. **STOP** when all topics reach the quota, or ``max_questions`` /
   the time limit is hit, or no candidate remains. A topic with an empty bank
   is reported via ``INSUFFICIENT_QUESTIONS`` rather than raising.

Ties are broken deterministically: score first, then the seeded stable order,
then question id.
"""

from __future__ import annotations

import random
from dataclasses import dataclass, field
from typing import Mapping, Sequence

from .adaptive_rules import AdaptiveRules

#: Stop reasons returned when no question is selected.
STOP_COVERED = "COVERED"
STOP_MAX_LENGTH = "MAX_LENGTH"
STOP_TIME_LIMIT = "TIME_LIMIT"
STOP_NO_CANDIDATES = "NO_CANDIDATES"
STOP_INSUFFICIENT = "INSUFFICIENT_QUESTIONS"

#: Selection reason codes.
REASON_COVERAGE = "COVERAGE"
REASON_DIFFICULTY = "DIFFICULTY"
REASON_MISCONCEPTION = "MISCONCEPTION"
REASON_RECENT_SKIP = "RECENT_SKIP"


@dataclass(frozen=True)
class Reason:
    """A structured explanation: a stable code plus numeric params (no prose)."""

    code: str
    params: Mapping[str, object]


@dataclass(frozen=True)
class AdaptiveCandidate:
    """A selectable question with the metadata selection depends on."""

    question_id: str
    topic_id: str
    difficulty: int
    misconception_ids: tuple[str, ...] = ()
    is_published: bool = True


@dataclass(frozen=True)
class AdaptiveState:
    """Everything selection needs to know about an attempt so far.

    ``topic_order`` fixes a stable topic iteration order (the caller passes the
    topics sorted deterministically). Topics absent from the candidate bank are
    still listed so they can be reported as insufficient.
    """

    topic_order: tuple[str, ...] = ()
    asked_question_ids: tuple[str, ...] = ()
    recently_seen_ids: frozenset[str] = frozenset()
    topic_asked_counts: Mapping[str, int] = field(default_factory=dict)
    topic_difficulty: Mapping[str, int] = field(default_factory=dict)
    tested_misconception_ids: frozenset[str] = frozenset()
    elapsed_seconds: int = 0

    @property
    def asked_total(self) -> int:
        return len(self.asked_question_ids)


@dataclass(frozen=True)
class AdaptiveDecision:
    question_id: str | None
    stop_reason: str | None = None
    #: Topics whose bank is thinner than the per-topic quota (stable order).
    insufficient_topics: tuple[str, ...] = ()
    reasons: tuple[Reason, ...] = ()

    @property
    def stopped(self) -> bool:
        return self.question_id is None


def _topic_target_difficulty(state: AdaptiveState, topic_id: str, rules: AdaptiveRules) -> int:
    return rules.clamp_difficulty(
        state.topic_difficulty.get(topic_id, rules.start_difficulty)
    )


def _coverage_stop(state: AdaptiveState, candidates_by_topic: Mapping[str, list], rules) -> bool:
    """True when every topic with a bank has reached its per-topic quota."""
    if not rules.stop_when_covered:
        return False
    for topic_id in state.topic_order:
        bank = candidates_by_topic.get(topic_id, [])
        if not bank:
            continue
        if state.topic_asked_counts.get(topic_id, 0) < rules.min_questions_per_topic:
            return False
    # If no topic has a bank, coverage is vacuously true only if there are no
    # topics at all; otherwise the insufficient path handles it.
    return any(candidates_by_topic.get(topic_id) for topic_id in state.topic_order)


def select_next_question(
    state: AdaptiveState,
    candidates: Sequence[AdaptiveCandidate],
    rules: AdaptiveRules,
    seed: int,
) -> AdaptiveDecision:
    """Pick the next question or return a STOP decision.

    Deterministic for a given ``(state, candidates, rules, seed)``.
    """
    asked = set(state.asked_question_ids)
    published = [c for c in candidates if c.is_published]
    candidates_by_topic: dict[str, list[AdaptiveCandidate]] = {}
    for candidate in published:
        candidates_by_topic.setdefault(candidate.topic_id, []).append(candidate)

    insufficient = tuple(
        topic_id
        for topic_id in state.topic_order
        if len(candidates_by_topic.get(topic_id, [])) < rules.min_questions_per_topic
    )

    # Hard stops first.
    if _coverage_stop(state, candidates_by_topic, rules):
        return AdaptiveDecision(
            None,
            stop_reason=STOP_COVERED,
            insufficient_topics=insufficient,
            reasons=(Reason(REASON_COVERAGE, {"covered_topics": len(state.topic_order)}),),
        )

    if state.asked_total >= rules.max_questions:
        return AdaptiveDecision(
            None,
            stop_reason=STOP_MAX_LENGTH,
            insufficient_topics=insufficient,
            reasons=(Reason(REASON_COVERAGE, {"max_questions": rules.max_questions}),),
        )

    topic_order = list(state.topic_order)
    if not topic_order:
        # Fall back to a stable order derived from the bank itself.
        topic_order = sorted(candidates_by_topic)

    # 1. Coverage-first: topics below quota, in stable round-robin order.
    under_quota = [
        topic_id
        for topic_id in topic_order
        if state.topic_asked_counts.get(topic_id, 0) < rules.min_questions_per_topic
    ]

    # 2. If all topics are covered (or stop_when_covered is off), consider every
    #    topic that still has an eligible question.
    pools = under_quota or ([] if rules.stop_when_covered else topic_order)

    rng = random.Random(seed)
    # Seeded stable order over candidate ids, so ties are reproducible.
    order_key = {
        candidate.question_id: rng.random()
        for candidate in sorted(published, key=lambda c: c.question_id)
    }

    best: AdaptiveCandidate | None = None
    best_topic: str | None = None
    best_score: tuple[float, float, str] | None = None

    candidate_pool: list[tuple[str, list[AdaptiveCandidate]]] = []
    if pools:
        candidate_pool = [(topic_id, candidates_by_topic.get(topic_id, [])) for topic_id in pools]
    else:
        # Not stopping-on-covered: rotate across all topics.
        candidate_pool = [(topic_id, candidates_by_topic.get(topic_id, [])) for topic_id in topic_order]

    for topic_id, bank in candidate_pool:
        target = _topic_target_difficulty(state, topic_id, rules)
        for candidate in bank:
            if candidate.question_id in asked:
                continue
            if candidate.question_id in state.recently_seen_ids:
                continue
            # Difficulty fit: closer to the topic target is better (0 best).
            difficulty_distance = abs(int(candidate.difficulty) - target)
            untested = (
                rules.prefer_untested_misconceptions
                and any(
                    mid not in state.tested_misconception_ids
                    for mid in candidate.misconception_ids
                )
            )
            # Lower is better: distance, then -bonus, then seeded order, then id.
            score = (
                difficulty_distance,
                -rules.misconception_bonus if untested else 0.0,
                order_key.get(candidate.question_id, 1.0),
                candidate.question_id,
            )
            if best_score is None or score < best_score:
                best_score = score
                best = candidate
                best_topic = topic_id

    if best is None:
        # No eligible question in the coverage pools.
        if insufficient:
            # A topic can never reach its quota: report it instead of failing.
            return AdaptiveDecision(
                None,
                stop_reason=STOP_INSUFFICIENT,
                insufficient_topics=insufficient,
                reasons=(
                    Reason(
                        REASON_COVERAGE,
                        {"insufficient_topics": list(insufficient)},
                    ),
                ),
            )
        all_eligible = [
            c
            for c in published
            if c.question_id not in asked and c.question_id not in state.recently_seen_ids
        ]
        if not all_eligible:
            return AdaptiveDecision(
                None,
                stop_reason=STOP_NO_CANDIDATES,
                insufficient_topics=insufficient,
                reasons=(
                    Reason(
                        REASON_RECENT_SKIP,
                        {"recently_seen": len(state.recently_seen_ids)},
                    ),
                ),
            )
        # Coverage pools are exhausted but questions remain elsewhere (e.g.
        # stop_when_covered with all topics at quota). Stop as covered.
        return AdaptiveDecision(
            None,
            stop_reason=STOP_COVERED,
            insufficient_topics=insufficient,
            reasons=(Reason(REASON_COVERAGE, {"covered_topics": len(topic_order)}),),
        )

    reasons: list[Reason] = [
        Reason(
            REASON_COVERAGE,
            {"topic": best_topic, "asked": state.topic_asked_counts.get(best_topic, 0)},
        ),
        Reason(
            REASON_DIFFICULTY,
            {
                "target": _topic_target_difficulty(state, best_topic, rules),
                "difficulty": best.difficulty,
            },
        ),
    ]
    if best.misconception_ids:
        reasons.append(
            Reason(
                REASON_MISCONCEPTION,
                {"misconception_ids": list(best.misconception_ids)},
            )
        )
    return AdaptiveDecision(
        question_id=best.question_id,
        insufficient_topics=insufficient,
        reasons=tuple(reasons),
    )


def apply_answer(
    state: AdaptiveState,
    question_id: str,
    topic_id: str,
    is_correct: bool,
    rules: AdaptiveRules,
    *,
    selected_misconception_ids: Sequence[str] = (),
) -> AdaptiveState:
    """Return a new state after answering one question.

    Moves that topic's target difficulty up on a correct answer and down on a
    wrong one, records the question as asked and adds any tested misconception.
    """
    new_counts = dict(state.topic_asked_counts)
    new_counts[topic_id] = new_counts.get(topic_id, 0) + 1

    current_target = _topic_target_difficulty(state, topic_id, rules)
    if is_correct:
        new_target = current_target + rules.difficulty_step
    else:
        new_target = current_target - rules.difficulty_step
    new_difficulty = dict(state.topic_difficulty)
    new_difficulty[topic_id] = rules.clamp_difficulty(new_target)

    tested = set(state.tested_misconception_ids)
    tested.update(selected_misconception_ids)

    return AdaptiveState(
        topic_order=state.topic_order,
        asked_question_ids=state.asked_question_ids + (question_id,),
        recently_seen_ids=state.recently_seen_ids,
        topic_asked_counts=new_counts,
        topic_difficulty=new_difficulty,
        tested_misconception_ids=frozenset(tested),
        elapsed_seconds=state.elapsed_seconds,
    )
