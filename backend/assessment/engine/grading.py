"""Pure grading engine for assessment questions.

No Django, no DB, no clock: callers pass the answer key and the student's raw
JSON response, and get back a :class:`GradeResult`. The same functions are used
by the attempt service and by the engine unit tests.

Response shape (JSON, stored verbatim on ``AttemptAnswer.response``):

* choice questions (MCQ_SINGLE / MCQ_MULTI / TRUE_FALSE):
  ``{"option_ids": ["<uuid>", ...]}`` -- a bare list or bare id is also accepted.
* numeric questions: ``{"value": "3.14"}`` -- a bare number/string is accepted.

Dispatchers accept the same strings as ``assessment.models.Question.Kind`` but
are plain constants so the module stays Django-free.
"""

from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal, InvalidOperation

KIND_MCQ_SINGLE = "MCQ_SINGLE"
KIND_MCQ_MULTI = "MCQ_MULTI"
KIND_TRUE_FALSE = "TRUE_FALSE"
KIND_NUMERIC = "NUMERIC"

CHOICE_KINDS = (KIND_MCQ_SINGLE, KIND_MCQ_MULTI, KIND_TRUE_FALSE)


@dataclass(frozen=True)
class NumericKey:
    """The answer key for a numeric question."""

    correct_value: Decimal
    tolerance_abs: Decimal | None = None
    tolerance_rel: Decimal | None = None


@dataclass(frozen=True)
class GradeResult:
    is_correct: bool
    partial_score: float
    matched_option_ids: tuple[str, ...] = ()
    misconception_ids: tuple[str, ...] = ()


def _as_decimal(value):
    if value is None or isinstance(value, bool):
        return None
    if isinstance(value, Decimal):
        return value
    try:
        return Decimal(str(value).strip())
    except (InvalidOperation, TypeError, ValueError):
        return None


def extract_option_ids(response) -> list[str]:
    """Normalise a choice response into an ordered list of option id strings."""
    if response is None:
        return []
    if isinstance(response, dict):
        raw = response.get("option_ids")
        if raw is None:
            raw = response.get("options")
        if raw is None:
            raw = response.get("option")
    else:
        raw = response

    if raw is None:
        return []
    if isinstance(raw, bytes):
        raw = raw.decode("utf-8", "ignore")
    if isinstance(raw, str):
        text = raw.strip()
        return [text] if text else []
    if isinstance(raw, (list, tuple, set)):
        out: list[str] = []
        for item in raw:
            if item is None:
                continue
            text = str(item).strip()
            if text:
                out.append(text)
        return out
    return [str(raw).strip()]


def extract_numeric_value(response):
    """Normalise a numeric response into a ``Decimal`` (or ``None``)."""
    if isinstance(response, dict):
        raw = response.get("value")
        if raw is None:
            raw = response.get("answer")
        if raw is None and len(response) == 1:
            raw = next(iter(response.values()))
    else:
        raw = response
    return _as_decimal(raw)


def _clamp(value: float) -> float:
    return max(0.0, min(1.0, value))


def grade_choice(
    kind: str,
    correct_ids,
    response,
    option_misconceptions=None,
) -> GradeResult:
    """Grade a choice question.

    * single-answer kinds require exactly the correct option;
    * multi-answer kinds are all-or-nothing for ``is_correct`` and award a
      partial score of ``(matched - wrong) / correct`` clamped to 0..1.
    """
    correct = {str(item) for item in correct_ids}
    selected = set(extract_option_ids(response))
    matched = selected & correct
    wrong = selected - correct

    misconceptions = option_misconceptions or {}
    misconception_ids: list[str] = []
    for option_id in sorted(wrong):
        hit = misconceptions.get(option_id)
        if hit is not None:
            misconception_ids.append(str(hit))

    if kind == KIND_MCQ_MULTI:
        if not correct:
            partial = 0.0
        else:
            partial = _clamp((len(matched) - len(wrong)) / len(correct))
        is_correct = bool(correct) and selected == correct
    else:
        is_correct = len(selected) == 1 and selected == correct
        partial = 1.0 if is_correct else 0.0

    return GradeResult(
        is_correct=is_correct,
        partial_score=round(partial, 3),
        matched_option_ids=tuple(sorted(matched)),
        misconception_ids=tuple(misconception_ids),
    )


def grade_numeric(key: NumericKey, response) -> GradeResult:
    """Grade a numeric question against absolute and/or relative tolerance.

    With no tolerance set the answer is exact. When both tolerances are set a
    value is accepted if it is within either.
    """
    value = extract_numeric_value(response)
    if value is None:
        return GradeResult(is_correct=False, partial_score=0.0)

    diff = abs(value - key.correct_value)
    if key.tolerance_abs is None and key.tolerance_rel is None:
        ok = diff == 0
    else:
        ok = False
        if key.tolerance_abs is not None and diff <= key.tolerance_abs:
            ok = True
        if key.tolerance_rel is not None:
            if key.correct_value == 0:
                ok = ok or diff == 0
            elif diff <= abs(key.correct_value) * key.tolerance_rel:
                ok = True
    return GradeResult(is_correct=ok, partial_score=1.0 if ok else 0.0)


def grade(
    kind: str,
    *,
    response,
    correct_ids=(),
    numeric_key: NumericKey | None = None,
    option_misconceptions=None,
) -> GradeResult:
    """Grade any question kind."""
    if kind == KIND_NUMERIC:
        if numeric_key is None:
            raise ValueError("numeric_key is required to grade a NUMERIC question")
        return grade_numeric(numeric_key, response)
    if kind not in CHOICE_KINDS:
        raise ValueError(f"Unknown question kind: {kind!r}")
    return grade_choice(kind, correct_ids, response, option_misconceptions)
