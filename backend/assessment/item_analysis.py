"""Item-analysis orchestration (Phase A10).

Gathers a question's scored answers from the database and runs the pure
:mod:`assessment.engine.item_analysis` analyser. Read-only: it never writes.
"""

from __future__ import annotations

from .engine.item_analysis import ItemAnalysisResult, ItemResponse, analyse_item
from .engine.item_analysis_rules import ItemAnalysisRules, load_item_analysis_rules
from .models import AttemptAnswer, Question


def _selected_option(response) -> str | None:
    if not isinstance(response, dict):
        return None
    option_ids = response.get("option_ids")
    if isinstance(option_ids, list) and option_ids:
        return str(option_ids[0])
    if isinstance(option_ids, str):
        return option_ids
    return None


def _correct_option_id(question: Question) -> str | None:
    # Only single-answer items have an unambiguous correct option to exclude from
    # the ambiguous-distractor check.
    if question.kind not in (Question.Kind.MCQ_SINGLE, Question.Kind.TRUE_FALSE):
        return None
    correct = question.options.filter(is_correct=True).values_list("uuid", flat=True)
    correct = list(correct)
    if len(correct) == 1:
        return str(correct[0])
    return None


def item_analysis_for_question(
    question: Question,
    rules: ItemAnalysisRules | None = None,
) -> ItemAnalysisResult:
    rules = rules or load_item_analysis_rules()
    answers = AttemptAnswer.objects.filter(question=question).select_related("attempt")
    responses = [
        ItemResponse(
            student_id=str(answer.attempt.student_id),
            is_correct=answer.is_correct,
            selected_option_id=_selected_option(answer.response),
            time_spent_s=answer.time_spent_s,
            total_score=float(answer.attempt.score or 0.0),
        )
        for answer in answers
    ]
    return analyse_item(responses, rules, correct_option_id=_correct_option_id(question))


def item_analysis_for_questions(questions, rules: ItemAnalysisRules | None = None):
    rules = rules or load_item_analysis_rules()
    return [
        (question, item_analysis_for_question(question, rules)) for question in questions
    ]


def result_to_dict(result: ItemAnalysisResult) -> dict:
    return {
        "attempts": result.attempts,
        "correct": result.correct,
        "pct_correct": result.pct_correct,
        "avg_time_s": result.avg_time_s,
        "discrimination": result.discrimination,
        "option_distribution": dict(result.option_distribution),
        "flags": [
            {"code": flag.code, "params": dict(flag.params)} for flag in result.flags
        ],
    }
