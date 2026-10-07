"""Bulk import for assessment questions (CSV or JSON).

The same logic backs ``manage.py import_questions`` and the staff endpoint, so
the documented schema and the error reporting are identical.

Document schema
---------------
JSON::

    {
      "meta": {"description": "...", "verified": false},
      "misconceptions": [
        {"topic": "<topic-uuid>", "code": "SIGN_ERROR",
         "description_ar": "...", "description_fr": "..."}
      ],
      "questions": [
        {
          "external_id": "alg-1-001",        # idempotency key (required)
          "author": "<teacher-uuid>",         # optional per row; else --author
          "topic": "<topic-uuid>",
          "objective": "<objective-uuid>",    # optional
          "curriculum_version": "<uuid>",
          "kind": "MCQ_SINGLE",               # MCQ_SINGLE|MCQ_MULTI|TRUE_FALSE|NUMERIC
          "prompt_ar": "...", "prompt_fr": "...",
          "difficulty": 3,                    # 1-5
          "est_seconds": 60,                  # optional
          "explanation_ar": "...", "explanation_fr": "...",
          "status": "DRAFT",                  # DRAFT|IN_REVIEW|PUBLISHED|RETIRED
          "is_sample": false,
          "source_note": "placeholder",
          "numeric": {                        # NUMERIC only
            "correct_value": "3.14",
            "tolerance_abs": "0.01", "tolerance_rel": null,
            "accepted_units": ["m"]
          },
          "options": [                        # choice questions only
            {"text_ar": "...", "text_fr": "...", "is_correct": true,
             "order": 1, "misconception_code": null}
          ]
        }
      ]
    }

CSV: one row per option, question fields repeated. Columns::

    external_id,author,topic,objective,curriculum_version,kind,
    prompt_ar,prompt_fr,difficulty,est_seconds,explanation_ar,explanation_fr,
    status,is_sample,source_note,
    option_order,option_text_ar,option_text_fr,option_is_correct,
    option_misconception_code,
    numeric_correct_value,numeric_tolerance_abs,numeric_tolerance_rel,
    numeric_accepted_units

Behaviour:
* Idempotent by ``external_id`` (``update_or_create``); re-importing the same
  file updates rows instead of duplicating them.
* Every row is validated. A row with fatal errors is skipped and reported; valid
  rows still import.
* Structural rules (option counts, numeric spec) are fatal for rows that ask to
  be ``PUBLISHED``/``IN_REVIEW`` and are reported as *warnings* for drafts.
* ``dry_run`` performs all validation and writes nothing.
"""

from __future__ import annotations

import csv
import io
import json
from dataclasses import asdict, dataclass, field
from decimal import Decimal, InvalidOperation
from pathlib import Path

from django.db import transaction

from planner.models import CurriculumVersion, LearningObjective, Topic
from users.models import Teacher

from .models import (
    Misconception,
    NumericAnswerSpec,
    Question,
    QuestionOption,
    option_structure_errors,
)

FATAL_STATUSES = {Question.Status.IN_REVIEW, Question.Status.PUBLISHED}

_REQUIRED_QUESTION_FIELDS = (
    "topic",
    "curriculum_version",
    "kind",
)


@dataclass
class RowResult:
    row: int
    external_id: str | None
    action: str  # created | updated | error
    errors: dict = field(default_factory=dict)
    warnings: dict = field(default_factory=dict)


@dataclass
class ImportReport:
    dry_run: bool
    rows: list[RowResult]

    @property
    def created(self) -> int:
        return sum(1 for row in self.rows if row.action == "created")

    @property
    def updated(self) -> int:
        return sum(1 for row in self.rows if row.action == "updated")

    @property
    def failed(self) -> int:
        return sum(1 for row in self.rows if row.action == "error")

    def as_dict(self) -> dict:
        return {
            "dry_run": self.dry_run,
            "created": self.created,
            "updated": self.updated,
            "failed": self.failed,
            "rows": [asdict(row) for row in self.rows],
        }


# --- coercion helpers ---------------------------------------------------------


def _text(value) -> str:
    if value is None:
        return ""
    return str(value).strip()


def _bool(value) -> bool:
    if isinstance(value, bool):
        return value
    return _text(value).lower() in {"1", "true", "yes", "y", "t"}


def _int(value, *, default=None):
    text = _text(value)
    if not text:
        return default
    try:
        return int(text)
    except (TypeError, ValueError):
        return None


def _decimal(value):
    text = _text(value)
    if not text:
        return None
    try:
        return Decimal(text)
    except (InvalidOperation, TypeError, ValueError):
        return None


def load_document(path: str | Path) -> dict:
    """Read a JSON or CSV import document from ``path``."""
    path = Path(path)
    text = path.read_text(encoding="utf-8")
    if path.suffix.lower() == ".csv":
        return parse_csv(text)
    return json.loads(text)


def parse_csv(text: str) -> dict:
    """Group flat CSV rows into the JSON question shape."""
    reader = csv.DictReader(io.StringIO(text))
    questions: dict[str, dict] = {}
    order: list[str] = []

    for row in reader:
        external_id = _text(row.get("external_id"))
        if not external_id:
            raise ValueError("CSV rows require an external_id to group options.")
        if external_id not in questions:
            questions[external_id] = {
                "external_id": external_id,
                "author": _text(row.get("author")) or None,
                "topic": _text(row.get("topic")) or None,
                "objective": _text(row.get("objective")) or None,
                "curriculum_version": _text(row.get("curriculum_version")) or None,
                "kind": _text(row.get("kind")),
                "prompt_ar": _text(row.get("prompt_ar")),
                "prompt_fr": _text(row.get("prompt_fr")),
                "difficulty": _text(row.get("difficulty")),
                "est_seconds": _text(row.get("est_seconds")),
                "explanation_ar": _text(row.get("explanation_ar")),
                "explanation_fr": _text(row.get("explanation_fr")),
                "status": _text(row.get("status")) or Question.Status.DRAFT,
                "is_sample": _text(row.get("is_sample")),
                "source_note": _text(row.get("source_note")),
                "options": [],
            }
            order.append(external_id)

        question = questions[external_id]
        option_text = _text(row.get("option_text_ar")) or _text(row.get("option_text_fr"))
        if option_text or _text(row.get("option_is_correct")):
            question["options"].append(
                {
                    "text_ar": _text(row.get("option_text_ar")),
                    "text_fr": _text(row.get("option_text_fr")),
                    "is_correct": _bool(row.get("option_is_correct")),
                    "order": _text(row.get("option_order")),
                    "misconception_code": _text(row.get("option_misconception_code")) or None,
                }
            )

        if _text(row.get("numeric_correct_value")):
            units = _text(row.get("numeric_accepted_units"))
            question["numeric"] = {
                "correct_value": _text(row.get("numeric_correct_value")),
                "tolerance_abs": _text(row.get("numeric_tolerance_abs")) or None,
                "tolerance_rel": _text(row.get("numeric_tolerance_rel")) or None,
                "accepted_units": [u.strip() for u in units.split("|") if u.strip()] or None,
            }

    return {"questions": [questions[key] for key in order]}


# --- import -------------------------------------------------------------------


def _resolve(model, value, field_name: str, errors: dict):
    if not value:
        errors[field_name] = "This field is required."
        return None
    obj = model.objects.filter(uuid=value).first()
    if obj is None:
        errors[field_name] = f"{model.__name__} {value} not found."
    return obj


def _parse_options(raw_options) -> tuple[list[dict], dict]:
    options: list[dict] = []
    structure_errors: dict[str, str] = {}
    for index, raw in enumerate(raw_options or [], start=1):
        order = _int(raw.get("order"), default=index)
        options.append(
            {
                "text_ar": _text(raw.get("text_ar")),
                "text_fr": _text(raw.get("text_fr")),
                "is_correct": _bool(raw.get("is_correct")),
                "order": order if order else index,
                "misconception_code": _text(raw.get("misconception_code")) or None,
            }
        )
    orders = [opt["order"] for opt in options]
    if len(set(orders)) != len(orders):
        structure_errors["options"] = "Option order values must be unique."
    return options, structure_errors


def _parse_numeric(raw):
    if not raw:
        return None
    value = _decimal(raw.get("correct_value"))
    if value is None:
        return {"error": "numeric.correct_value must be a number."}
    tolerance_abs = _decimal(raw.get("tolerance_abs"))
    tolerance_rel = _decimal(raw.get("tolerance_rel"))
    if raw.get("tolerance_abs") not in (None, "") and tolerance_abs is None:
        return {"error": "numeric.tolerance_abs must be a number."}
    if raw.get("tolerance_rel") not in (None, "") and tolerance_rel is None:
        return {"error": "numeric.tolerance_rel must be a number."}
    if tolerance_abs is not None and tolerance_abs < 0:
        return {"error": "numeric.tolerance_abs must not be negative."}
    if tolerance_rel is not None and tolerance_rel < 0:
        return {"error": "numeric.tolerance_rel must not be negative."}

    units = raw.get("accepted_units")
    if isinstance(units, str):
        units = [item.strip() for item in units.split("|") if item.strip()]
    elif isinstance(units, list):
        units = [str(item).strip() for item in units if str(item).strip()]
    else:
        units = None

    return {
        "correct_value": value,
        "tolerance_abs": tolerance_abs,
        "tolerance_rel": tolerance_rel,
        "accepted_units": units or None,
    }


def import_questions(
    document,
    *,
    author: Teacher,
    dry_run: bool = False,
    misconception_codes: set[tuple[str, str]] | None = None,
) -> ImportReport:
    """Import ``document`` (parsed JSON, or a list of question dicts)."""
    if isinstance(document, dict):
        questions = document.get("questions") or []
        misconceptions = document.get("misconceptions") or []
    else:
        questions = document or []
        misconceptions = []

    # (topic_uuid, code) pairs declared in the same document, so a dry run can
    # validate references to not-yet-saved misconceptions.
    declared_codes = set(misconception_codes or set())
    for item in misconceptions:
        topic_ref = _text(item.get("topic"))
        code = _text(item.get("code"))
        if topic_ref and code:
            declared_codes.add((topic_ref, code))

    if not dry_run:
        _upsert_misconceptions(misconceptions, declared_codes)

    rows = [
        _import_one(
            data,
            index,
            default_author=author,
            dry_run=dry_run,
            declared_codes=declared_codes,
        )
        for index, data in enumerate(questions, start=1)
    ]
    return ImportReport(dry_run=dry_run, rows=rows)


def _upsert_misconceptions(misconceptions, declared_codes) -> None:
    for item in misconceptions:
        topic_ref = _text(item.get("topic"))
        code = _text(item.get("code"))
        if not topic_ref or not code:
            continue
        topic = Topic.objects.filter(uuid=topic_ref).first()
        if topic is None:
            continue
        Misconception.objects.update_or_create(
            topic=topic,
            code=code,
            defaults={
                "description_ar": _text(item.get("description_ar")),
                "description_fr": _text(item.get("description_fr")),
            },
        )
        declared_codes.add((topic_ref, code))


def _import_one(
    data,
    index: int,
    *,
    default_author: Teacher,
    dry_run: bool,
    declared_codes: set[tuple[str, str]],
) -> RowResult:
    external_id = _text(data.get("external_id")) or None
    errors: dict[str, str] = {}
    warnings: dict[str, str] = {}

    if external_id is None:
        errors["external_id"] = "external_id is required for idempotent import."

    kind = _text(data.get("kind"))
    if kind not in set(Question.Kind.values):
        errors["kind"] = f"kind must be one of {sorted(Question.Kind.values)}."

    status = _text(data.get("status")) or Question.Status.DRAFT
    if status not in set(Question.Status.values):
        errors["status"] = f"status must be one of {sorted(Question.Status.values)}."

    topic = _resolve(Topic, _text(data.get("topic")), "topic", errors)
    curriculum = _resolve(
        CurriculumVersion,
        _text(data.get("curriculum_version")),
        "curriculum_version",
        errors,
    )
    objective = None
    objective_ref = _text(data.get("objective"))
    if objective_ref:
        objective = _resolve(
            LearningObjective, objective_ref, "objective", errors
        )

    row_author = default_author
    author_ref = _text(data.get("author"))
    if author_ref:
        row_author = _resolve(Teacher, author_ref, "author", errors)
    if row_author is None:
        errors["author"] = "An author is required (row author or command --author)."

    if topic is not None and curriculum is not None:
        if topic.chapter.curriculum_id != curriculum.id:
            errors["curriculum_version"] = "Does not match the topic's curriculum."
    if objective is not None and topic is not None and objective.topic_id != topic.id:
        errors["objective"] = "Does not belong to the topic."

    difficulty = _int(data.get("difficulty"), default=3)
    if difficulty is None or not 1 <= difficulty <= 5:
        errors["difficulty"] = "difficulty must be an integer between 1 and 5."

    est_seconds = _int(data.get("est_seconds"))
    if _text(data.get("est_seconds")) and est_seconds is None:
        errors["est_seconds"] = "est_seconds must be an integer."

    options, option_errors = _parse_options(data.get("options"))
    errors.update(option_errors)

    numeric = _parse_numeric(data.get("numeric"))
    if numeric and "error" in numeric:
        errors["numeric"] = numeric["error"]

    # Misconception references must exist either in the DB or the same document.
    if topic is not None:
        for option in options:
            code = option["misconception_code"]
            if code and (str(topic.uuid), code) not in declared_codes:
                exists = Misconception.objects.filter(topic=topic, code=code).exists()
                if not exists:
                    errors["options"] = (
                        f"Misconception '{code}' is not defined for this topic."
                    )

    structure_errors = option_structure_errors(
        kind, [bool(option["is_correct"]) for option in options]
    )
    if kind == Question.Kind.NUMERIC and not numeric:
        structure_errors["numeric_spec"] = "NUMERIC rows need a numeric spec."

    if status in FATAL_STATUSES:
        errors.update(structure_errors)
        if status == Question.Status.PUBLISHED:
            if not _text(data.get("prompt_ar")) and not _text(data.get("prompt_fr")):
                errors["prompt"] = "Provide the prompt in at least one language."
            if not _text(data.get("explanation_ar")) and not _text(
                data.get("explanation_fr")
            ):
                errors["explanation"] = "Provide the explanation in at least one language."
    else:
        warnings.update(structure_errors)

    if errors:
        return RowResult(index, external_id, "error", errors, warnings)

    existing = (
        Question.objects.filter(external_id=external_id).first()
        if external_id
        else None
    )
    if dry_run:
        return RowResult(index, external_id, "updated" if existing else "created", {}, warnings)

    question = _save_question(
        existing,
        data,
        external_id=external_id,
        topic=topic,
        objective=objective,
        curriculum=curriculum,
        kind=kind,
        status=status,
        difficulty=difficulty,
        est_seconds=est_seconds,
        author=row_author,
        options=options,
        numeric=numeric,
    )
    return RowResult(index, external_id, "updated" if existing else "created", {}, warnings)


def _save_question(
    existing,
    data,
    *,
    external_id,
    topic,
    objective,
    curriculum,
    kind,
    status,
    difficulty,
    est_seconds,
    author,
    options,
    numeric,
) -> Question:
    fields = {
        "topic": topic,
        "objective": objective,
        "curriculum_version": curriculum,
        "kind": kind,
        "prompt_ar": _text(data.get("prompt_ar")),
        "prompt_fr": _text(data.get("prompt_fr")),
        "difficulty": difficulty,
        "est_seconds": est_seconds,
        "explanation_ar": _text(data.get("explanation_ar")),
        "explanation_fr": _text(data.get("explanation_fr")),
        "status": status,
        "is_sample": _bool(data.get("is_sample")),
        "source_note": _text(data.get("source_note")),
        "external_id": external_id,
        "author": author,
    }
    with transaction.atomic():
        if existing is None:
            question = Question.objects.create(**fields)
        else:
            for key, value in fields.items():
                setattr(existing, key, value)
            existing.save()
            question = existing
            question.options.all().delete()
            NumericAnswerSpec.objects.filter(question=question).delete()
        for option in options:
            misconception = None
            if option["misconception_code"]:
                misconception = Misconception.objects.get(
                    topic=topic, code=option["misconception_code"]
                )
            QuestionOption.objects.create(
                question=question,
                text_ar=option["text_ar"],
                text_fr=option["text_fr"],
                is_correct=option["is_correct"],
                order=option["order"],
                misconception=misconception,
            )
        if numeric:
            NumericAnswerSpec.objects.create(question=question, **numeric)
    return question
