"""Assessment content models (Phase A1).

This app owns the *content* of curriculum-aligned questions: questions, their
options, the numeric answer spec and the misconceptions distractors map to.
It deliberately contains **no** quiz/attempt/mastery logic (later phases) and no
AI.

Curriculum alignment reuses the planner's curriculum tables:
``Question.topic`` -> ``planner.Topic`` -> ``planner.Chapter`` ->
``planner.CurriculumVersion``. ``Question.curriculum_version`` is stored
redundantly (per the A1 spec) and validated to match the topic's curriculum.

LaTeX convention
----------------
Prompt/explanation text may embed math using **dollar delimiters only**:
inline ``$...$`` and display ``$$...$$``. Text is stored verbatim; the backend
never parses or renders LaTeX (see ``assessment.constants`` and
``docs/assessment/A1.md``).

Draft vs. published validation
------------------------------
A question is authored incrementally, so structural rules (option counts,
numeric spec) are **not** enforced on every save -- a DRAFT may be incomplete.
They are enforced when the question is submitted for review and when it is
published (``validate_structure`` / ``validate_publishable``), and by the bulk
importer for rows that ask to be published.
"""

from __future__ import annotations

from django.conf import settings
from django.core.exceptions import ObjectDoesNotExist, ValidationError
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils import timezone

from core.models import UUIDModel

from .constants import (
    DIFFICULTY_MAX,
    DIFFICULTY_MIN,
    MIN_MCQ_OPTIONS,
    TRUE_FALSE_OPTIONS,
)

def option_structure_errors(kind: str, correctness: list[bool]) -> dict[str, str]:
    """Return ``{field: message}`` for a question kind and option correctness.

    ``correctness`` is the ordered ``is_correct`` flag of each option. Pure and
    side-effect free so the model, serializers, importer and tests all share one
    source of truth.
    """
    errors: dict[str, str] = {}
    count = len(correctness)
    correct = sum(1 for flag in correctness if flag)

    if kind == Question.Kind.NUMERIC:
        if count:
            errors["options"] = "Numeric questions must not define options."
        return errors

    if kind == Question.Kind.TRUE_FALSE:
        if count != TRUE_FALSE_OPTIONS:
            errors["options"] = (
                f"True/false questions need exactly {TRUE_FALSE_OPTIONS} options."
            )
        elif correct != 1:
            errors["options"] = "True/false questions need exactly one correct option."
        return errors

    # MCQ_SINGLE / MCQ_MULTI
    if count < MIN_MCQ_OPTIONS:
        errors["options"] = (
            f"Multiple-choice questions need at least {MIN_MCQ_OPTIONS} options."
        )
    elif kind == Question.Kind.MCQ_SINGLE and correct != 1:
        errors["options"] = "Single-choice questions need exactly one correct option."
    elif kind == Question.Kind.MCQ_MULTI and correct < 1:
        errors["options"] = "Multi-choice questions need at least one correct option."
    return errors


class Misconception(UUIDModel):
    """A known wrong idea a distractor is designed to catch.

    Scoped to a topic; ``code`` is a stable identifier unique within the topic so
    content can be imported idempotently.
    """

    topic = models.ForeignKey(
        "planner.Topic",
        on_delete=models.CASCADE,
        related_name="misconceptions",
    )
    code = models.CharField(max_length=100)
    description_ar = models.TextField(blank=True, default="")
    description_fr = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["topic", "code", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=["topic", "code"],
                name="assessment_unique_misconception_code",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.code} ({self.topic_id})"


class Question(UUIDModel):
    """A curriculum-aligned question authored by a teacher."""

    class Kind(models.TextChoices):
        MCQ_SINGLE = "MCQ_SINGLE", "Single choice"
        MCQ_MULTI = "MCQ_MULTI", "Multiple choice"
        TRUE_FALSE = "TRUE_FALSE", "True / false"
        NUMERIC = "NUMERIC", "Numeric"

    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        IN_REVIEW = "IN_REVIEW", "In review"
        PUBLISHED = "PUBLISHED", "Published"
        RETIRED = "RETIRED", "Retired"

    topic = models.ForeignKey(
        "planner.Topic",
        on_delete=models.PROTECT,
        related_name="questions",
    )
    objective = models.ForeignKey(
        "planner.LearningObjective",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="questions",
    )
    curriculum_version = models.ForeignKey(
        "planner.CurriculumVersion",
        on_delete=models.PROTECT,
        related_name="questions",
    )
    kind = models.CharField(max_length=12, choices=Kind.choices)
    prompt_ar = models.TextField(blank=True, default="")
    prompt_fr = models.TextField(blank=True, default="")
    image = models.ImageField(
        upload_to="assessment/questions/", null=True, blank=True
    )
    difficulty = models.PositiveSmallIntegerField(
        default=3,
        validators=[MinValueValidator(DIFFICULTY_MIN), MaxValueValidator(DIFFICULTY_MAX)],
    )
    est_seconds = models.PositiveIntegerField(null=True, blank=True)
    explanation_ar = models.TextField(blank=True, default="")
    explanation_fr = models.TextField(blank=True, default="")
    status = models.CharField(
        max_length=10, choices=Status.choices, default=Status.DRAFT
    )
    author = models.ForeignKey(
        "users.Teacher",
        on_delete=models.PROTECT,
        related_name="authored_questions",
    )
    reviewer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="reviewed_questions",
    )
    is_sample = models.BooleanField(default=False)
    source_note = models.CharField(max_length=255, blank=True, default="")
    #: Stable id for idempotent imports. Empty strings are normalised to NULL so
    #: the unique constraint allows many un-imported questions.
    external_id = models.CharField(
        max_length=200, null=True, blank=True, unique=True
    )
    review_comment = models.TextField(blank=True, default="")
    reviewed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at", "id"]
        indexes = [
            models.Index(fields=["topic", "status"]),
            models.Index(fields=["status"]),
            models.Index(fields=["author"]),
        ]
        constraints = [
            models.CheckConstraint(
                check=models.Q(difficulty__gte=DIFFICULTY_MIN)
                & models.Q(difficulty__lte=DIFFICULTY_MAX),
                name="assessment_question_difficulty_range",
            ),
        ]

    def __str__(self) -> str:
        label = (self.prompt_fr or self.prompt_ar or "").strip()[:60]
        return label or f"Question {self.uuid}"

    def save(self, *args, **kwargs):
        if self.external_id == "":
            self.external_id = None
        super().save(*args, **kwargs)

    # -- serialisation helpers -------------------------------------------------

    @property
    def prompt_languages(self) -> list[str]:
        return [lang for lang in ("ar", "fr") if getattr(self, f"prompt_{lang}").strip()]

    @property
    def explanation_languages(self) -> list[str]:
        return [
            lang
            for lang in ("ar", "fr")
            if getattr(self, f"explanation_{lang}").strip()
        ]

    def _numeric_spec(self):
        try:
            return self.numeric_spec
        except ObjectDoesNotExist:
            return None

    # -- validation ------------------------------------------------------------

    def validate_structure(self) -> None:
        """Enforce the per-kind option/numeric rules. Raises ``ValidationError``."""
        correctness = list(self.options.values_list("is_correct", flat=True))
        errors = option_structure_errors(self.kind, correctness)
        if self.kind == self.Kind.NUMERIC and self._numeric_spec() is None:
            errors["numeric_spec"] = "Numeric questions require a numeric answer spec."
        if errors:
            raise ValidationError(errors)

    def validate_publishable(self) -> None:
        """Enforce the publish-time content rules. Raises ``ValidationError``."""
        errors: dict[str, str] = {}
        if self.topic_id is None:
            errors["topic"] = "A topic is required to publish."
        if not self.prompt_languages:
            errors["prompt"] = "Provide the prompt in at least one language."
        if not self.explanation_languages:
            errors["explanation"] = "Provide the explanation in at least one language."
        if errors:
            raise ValidationError(errors)

    # -- workflow --------------------------------------------------------------

    def submit_for_review(self) -> None:
        if self.status != self.Status.DRAFT:
            raise ValidationError(
                {"status": "Only a DRAFT question can be submitted for review."}
            )
        self.validate_structure()
        self.status = self.Status.IN_REVIEW
        self.review_comment = ""
        self.reviewed_at = None
        self.save(update_fields=["status", "review_comment", "reviewed_at", "updated_at"])

    def publish(self, reviewer, comment: str = "") -> None:
        if self.status != self.Status.IN_REVIEW:
            raise ValidationError(
                {"status": "Only a question IN_REVIEW can be published."}
            )
        self.validate_structure()
        self.validate_publishable()
        self.status = self.Status.PUBLISHED
        self.reviewer = reviewer
        self.review_comment = comment.strip()
        self.reviewed_at = timezone.now()
        self.save(
            update_fields=[
                "status",
                "reviewer",
                "review_comment",
                "reviewed_at",
                "updated_at",
            ]
        )

    def reject(self, reviewer, comment: str) -> None:
        if self.status != self.Status.IN_REVIEW:
            raise ValidationError(
                {"status": "Only a question IN_REVIEW can be rejected."}
            )
        if not (comment or "").strip():
            raise ValidationError({"comment": "A rejection comment is required."})
        self.status = self.Status.DRAFT
        self.reviewer = reviewer
        self.review_comment = comment.strip()
        self.reviewed_at = timezone.now()
        self.save(
            update_fields=[
                "status",
                "reviewer",
                "review_comment",
                "reviewed_at",
                "updated_at",
            ]
        )

    def retire(self, reviewer, comment: str = "") -> None:
        if self.status != self.Status.PUBLISHED:
            raise ValidationError(
                {"status": "Only a PUBLISHED question can be retired."}
            )
        self.status = self.Status.RETIRED
        self.reviewer = reviewer
        if (comment or "").strip():
            self.review_comment = comment.strip()
        self.reviewed_at = timezone.now()
        self.save(
            update_fields=["status", "reviewer", "review_comment", "reviewed_at", "updated_at"]
        )


class QuestionOption(UUIDModel):
    """One answer option of a choice question (or true/false's two options)."""

    question = models.ForeignKey(
        Question, on_delete=models.CASCADE, related_name="options"
    )
    text_ar = models.TextField(blank=True, default="")
    text_fr = models.TextField(blank=True, default="")
    is_correct = models.BooleanField(default=False)
    misconception = models.ForeignKey(
        Misconception,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="options",
    )
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=["question", "order"],
                name="assessment_unique_option_order",
            ),
        ]

    def __str__(self) -> str:
        text = (self.text_fr or self.text_ar or "").strip()[:40]
        return text or f"Option {self.order}"


class NumericAnswerSpec(UUIDModel):
    """The answer key for a numeric question.

    ``tolerance_abs`` and ``tolerance_rel`` are both optional; when neither is
    set the answer is exact. When both are set, grading (a later phase) should
    accept a value within either tolerance.
    """

    question = models.OneToOneField(
        Question, on_delete=models.CASCADE, related_name="numeric_spec"
    )
    correct_value = models.DecimalField(max_digits=20, decimal_places=6)
    tolerance_abs = models.DecimalField(
        max_digits=20, decimal_places=6, null=True, blank=True
    )
    tolerance_rel = models.DecimalField(
        max_digits=20, decimal_places=6, null=True, blank=True
    )
    accepted_units = models.JSONField(null=True, blank=True)

    class Meta:
        constraints = [
            models.CheckConstraint(
                check=models.Q(tolerance_abs__isnull=True) | models.Q(tolerance_abs__gte=0),
                name="assessment_numeric_tolerance_abs_non_negative",
            ),
            models.CheckConstraint(
                check=models.Q(tolerance_rel__isnull=True) | models.Q(tolerance_rel__gte=0),
                name="assessment_numeric_tolerance_rel_non_negative",
            ),
        ]

    def __str__(self) -> str:
        return f"numeric answer for {self.question_id}"


def normalize_quiz_config(config) -> dict:
    """Validate and normalise a ``Quiz.config`` JSON blob.

    Returns ``{"num_questions": int, "time_limit": int|None,
    "difficulty_range": [lo, hi]}``. Raises ``ValidationError`` otherwise.
    """
    if config in (None, ""):
        config = {}
    if not isinstance(config, dict):
        raise ValidationError({"config": "config must be a JSON object."})

    num_questions = config.get("num_questions", 10)
    try:
        num_questions = int(num_questions)
    except (TypeError, ValueError) as exc:
        raise ValidationError(
            {"config": "num_questions must be an integer."}
        ) from exc
    if num_questions < 1:
        raise ValidationError({"config": "num_questions must be at least 1."})

    time_limit = config.get("time_limit")
    if time_limit in (None, ""):
        time_limit = None
    else:
        try:
            time_limit = int(time_limit)
        except (TypeError, ValueError) as exc:
            raise ValidationError(
                {"config": "time_limit must be an integer number of minutes."}
            ) from exc
        if time_limit <= 0:
            raise ValidationError({"config": "time_limit must be positive."})

    difficulty_range = config.get("difficulty_range")
    if difficulty_range in (None, ""):
        bounds = [DIFFICULTY_MIN, DIFFICULTY_MAX]
    elif isinstance(difficulty_range, dict):
        bounds = [difficulty_range.get("min", DIFFICULTY_MIN), difficulty_range.get("max", DIFFICULTY_MAX)]
    elif isinstance(difficulty_range, (list, tuple)) and len(difficulty_range) == 2:
        bounds = list(difficulty_range)
    else:
        raise ValidationError(
            {"config": "difficulty_range must be [min, max] or {min, max}."}
        )
    try:
        low, high = int(bounds[0]), int(bounds[1])
    except (TypeError, ValueError) as exc:
        raise ValidationError(
            {"config": "difficulty_range bounds must be integers."}
        ) from exc
    if not (DIFFICULTY_MIN <= low <= high <= DIFFICULTY_MAX):
        raise ValidationError(
            {
                "config": (
                    "difficulty_range must satisfy "
                    f"{DIFFICULTY_MIN} <= min <= max <= {DIFFICULTY_MAX}."
                )
            }
        )
    return {
        "num_questions": num_questions,
        "time_limit": time_limit,
        "difficulty_range": [low, high],
    }


class Quiz(UUIDModel):
    """A curated assessment over PUBLISHED questions in a scope."""

    class Kind(models.TextChoices):
        DIAGNOSTIC = "DIAGNOSTIC", "Diagnostic"
        TOPIC_PRACTICE = "TOPIC_PRACTICE", "Topic practice"
        CHAPTER_TEST = "CHAPTER_TEST", "Chapter test"
        MOCK_EXAM = "MOCK_EXAM", "Mock exam"

    author = models.ForeignKey(
        "users.Teacher",
        on_delete=models.PROTECT,
        related_name="quizzes",
    )
    kind = models.CharField(max_length=16, choices=Kind.choices)
    title = models.CharField(max_length=255)
    # Scope: subject (free text, matching planner), chapter and/or topic.
    subject = models.CharField(max_length=150, blank=True, default="")
    chapter = models.ForeignKey(
        "planner.Chapter",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="quizzes",
    )
    topic = models.ForeignKey(
        "planner.Topic",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="quizzes",
    )
    config = models.JSONField(default=dict, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at", "id"]
        indexes = [models.Index(fields=["kind", "is_active"])]

    def clean(self) -> None:
        super().clean()
        if self.chapter_id and self.topic_id and self.topic.chapter_id != self.chapter_id:
            raise ValidationError(
                {"topic": "The topic does not belong to the selected chapter."}
            )
        normalize_quiz_config(self.config)

    def __str__(self) -> str:
        return self.title


class QuizAttempt(UUIDModel):
    """One student's run through a quiz."""

    class Status(models.TextChoices):
        IN_PROGRESS = "IN_PROGRESS", "In progress"
        SUBMITTED = "SUBMITTED", "Submitted"
        EXPIRED = "EXPIRED", "Expired"

    student = models.ForeignKey(
        "users.Student",
        on_delete=models.CASCADE,
        related_name="assessment_attempts",
    )
    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name="attempts")
    started_at = models.DateTimeField(auto_now_add=True)
    submitted_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(
        max_length=12, choices=Status.choices, default=Status.IN_PROGRESS
    )
    #: Seed used for the deterministic question shuffle.
    seed = models.BigIntegerField(null=True, blank=True)
    #: Ordered list of question uuids chosen for this attempt.
    question_ids = models.JSONField(default=list, blank=True)
    #: Adaptive (DIAGNOSTIC) session state, persisted so selection is
    #: reproducible and survives reload. Empty for non-adaptive quizzes.
    #: Shape: {topic_order, topic_asked_counts, topic_difficulty,
    #: tested_misconception_ids, insufficient_topics, stop_reason}.
    adaptive_state = models.JSONField(default=dict, blank=True)
    score = models.FloatField(null=True, blank=True)

    class Meta:
        ordering = ["-started_at", "id"]
        indexes = [models.Index(fields=["student", "quiz", "status"])]

    def __str__(self) -> str:
        return f"attempt {self.uuid} ({self.status})"


class AttemptAnswer(UUIDModel):
    """A student's answer to one question inside an attempt."""

    attempt = models.ForeignKey(
        QuizAttempt, on_delete=models.CASCADE, related_name="answers"
    )
    question = models.ForeignKey(
        Question, on_delete=models.CASCADE, related_name="attempt_answers"
    )
    response = models.JSONField(null=True, blank=True)
    is_correct = models.BooleanField(default=False)
    partial_score = models.FloatField(default=0.0)
    time_spent_s = models.PositiveIntegerField(null=True, blank=True)
    hint_used = models.BooleanField(default=False)
    misconception = models.ForeignKey(
        Misconception,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="attempt_answers",
    )
    answered_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["question_id", "id"]
        indexes = [
            # Phase A10 item analysis: by question, and wrong-answer counts.
            models.Index(fields=["question", "is_correct"]),
            models.Index(fields=["misconception"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["attempt", "question"],
                name="assessment_unique_answer_per_question",
            ),
            models.CheckConstraint(
                check=models.Q(partial_score__gte=0) & models.Q(partial_score__lte=1),
                name="assessment_attempt_answer_partial_score_range",
            ),
        ]

    def __str__(self) -> str:
        return f"answer to {self.question_id} on {self.attempt_id}"


class Evidence(UUIDModel):
    """A single scored observation about a student on a topic.

    Created per graded answer (and later by flashcards / planner exercises /
    teacher grades). ``source_ref_type``/``source_ref_id`` identify the origin
    so the row is idempotent. ``score`` is normalised to 0..1.
    """

    class Source(models.TextChoices):
        QUIZ = "QUIZ", "Quiz"
        FLASHCARD = "FLASHCARD", "Flashcard"
        PLANNER_EXERCISE = "PLANNER_EXERCISE", "Planner exercise"
        TEACHER_GRADE = "TEACHER_GRADE", "Teacher grade"

    student = models.ForeignKey(
        "users.Student", on_delete=models.CASCADE, related_name="evidence"
    )
    topic = models.ForeignKey(
        "planner.Topic", on_delete=models.CASCADE, related_name="evidence"
    )
    source = models.CharField(max_length=20, choices=Source.choices)
    source_ref_type = models.CharField(max_length=64, blank=True, default="")
    source_ref_id = models.CharField(max_length=64, blank=True, default="")
    score = models.DecimalField(max_digits=4, decimal_places=3)
    difficulty = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(DIFFICULTY_MIN), MaxValueValidator(DIFFICULTY_MAX)]
    )
    occurred_at = models.DateTimeField()
    question = models.ForeignKey(
        Question,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="evidence",
    )
    weight_modifier = models.FloatField(default=1.0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-occurred_at", "id"]
        indexes = [models.Index(fields=["student", "topic", "occurred_at"])]
        constraints = [
            models.CheckConstraint(
                check=models.Q(score__gte=0) & models.Q(score__lte=1),
                name="assessment_evidence_score_range",
            ),
            models.CheckConstraint(
                check=models.Q(weight_modifier__gte=0),
                name="assessment_evidence_weight_non_negative",
            ),
            models.UniqueConstraint(
                fields=["source", "source_ref_type", "source_ref_id", "question"],
                name="assessment_unique_evidence_per_source",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.source} evidence {self.student_id}/{self.topic_id}"


class MasteryRuleSet(UUIDModel):
    """A versioned, schema-validated bundle of mastery/readiness rules.

    Mirrors ``planner.PedagogyRuleSet``: the payload is JSON validated by
    ``assessment.mastery_schema``, every number carries a ``why`` string, and
    all values are placeholders until ``verified`` is set by a human. Exactly
    one rule set is expected to be active at a time; the engine falls back to
    the bundled default when none is.
    """

    name = models.CharField(max_length=120)
    version = models.PositiveIntegerField(default=1)
    is_active = models.BooleanField(default=False)
    #: JSON payload validated against ``assessment.mastery_schema``.
    json = models.JSONField(default=dict)
    verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name", "-version", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=["name", "version"],
                name="assessment_unique_mastery_ruleset_name_version",
            ),
        ]

    def _validate_rules(self) -> None:
        # Imported lazily so the schema module stays Django-free.
        from .mastery_schema import MasteryRulesError, validate_mastery_rules

        try:
            validate_mastery_rules(self.json)
        except MasteryRulesError as exc:
            raise ValidationError({"json": str(exc)}) from exc

    def clean(self) -> None:
        super().clean()
        self._validate_rules()

    def save(self, *args, **kwargs):
        self._validate_rules()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.name} v{self.version}"


class TopicMastery(UUIDModel):
    """Cached mastery for one (student, topic) pair.

    This is a **cache**: it is recomputed from ``Evidence`` when new evidence
    arrives or when the cached row is stale, and is always overwritten rather
    than incremented. ``reasons`` stores the structured engine explanation
    (stable codes + params) and ``rules_version`` records which rule set
    produced the value so a rule change can invalidate it.
    """

    class Confidence(models.TextChoices):
        NONE = "NONE", "None"
        LOW = "LOW", "Low"
        MEDIUM = "MEDIUM", "Medium"
        HIGH = "HIGH", "High"

    class Trend(models.TextChoices):
        UP = "UP", "Up"
        FLAT = "FLAT", "Flat"
        DOWN = "DOWN", "Down"
        UNKNOWN = "UNKNOWN", "Unknown"

    student = models.ForeignKey(
        "users.Student", on_delete=models.CASCADE, related_name="topic_mastery"
    )
    topic = models.ForeignKey(
        "planner.Topic", on_delete=models.CASCADE, related_name="topic_mastery"
    )
    #: ``None`` when confidence is NONE (not enough trustworthy evidence).
    mastery = models.FloatField(null=True, blank=True)
    confidence = models.CharField(
        max_length=8, choices=Confidence.choices, default=Confidence.NONE
    )
    trend = models.CharField(
        max_length=8, choices=Trend.choices, default=Trend.UNKNOWN
    )
    effective_weight = models.FloatField(default=0.0)
    evidence_count = models.PositiveIntegerField(default=0)
    last_evidence_at = models.DateTimeField(null=True, blank=True)
    computed_at = models.DateTimeField()
    #: ``version`` of the rule set that produced this value.
    rules_version = models.PositiveIntegerField(default=1)
    #: Structured engine reasons (list of ``{code, params}``).
    reasons = models.JSONField(default=list, blank=True)

    class Meta:
        ordering = ["student", "topic", "id"]
        verbose_name_plural = "topic mastery"
        indexes = [
            models.Index(fields=["student", "computed_at"]),
            models.Index(fields=["topic"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["student", "topic"],
                name="assessment_unique_topic_mastery",
            ),
            models.CheckConstraint(
                check=models.Q(mastery__isnull=True)
                | (models.Q(mastery__gte=0) & models.Q(mastery__lte=1)),
                name="assessment_topic_mastery_range",
            ),
        ]

    def __str__(self) -> str:
        value = "NONE" if self.mastery is None else f"{self.mastery:.2f}"
        return f"{self.student_id}/{self.topic_id} mastery={value}"


class FlashcardsRuleSet(UUIDModel):
    """A versioned, schema-validated bundle of Leitner/spaced-repetition rules.

    Mirrors ``MasteryRuleSet``/``planner.PedagogyRuleSet``: the JSON payload is
    validated by ``assessment.leitner_schema``, every number carries a ``why``
    string, and all values are placeholders until ``verified`` is set by a human.
    Exactly one rule set is expected to be active at a time; the engine falls
    back to the bundled default when none is.
    """

    name = models.CharField(max_length=120)
    version = models.PositiveIntegerField(default=1)
    is_active = models.BooleanField(default=False)
    #: JSON payload validated against ``assessment.leitner_schema``.
    json = models.JSONField(default=dict)
    verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name", "-version", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=["name", "version"],
                name="assessment_unique_leitner_ruleset_name_version",
            ),
        ]

    def _validate_rules(self) -> None:
        # Imported lazily so the schema module stays Django-free.
        from .leitner_schema import LeitnerRulesError, validate_leitner_rules

        try:
            validate_leitner_rules(self.json)
        except LeitnerRulesError as exc:
            raise ValidationError({"json": str(exc)}) from exc

    def clean(self) -> None:
        super().clean()
        self._validate_rules()

    def save(self, *args, **kwargs):
        self._validate_rules()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.name} v{self.version}"


class Flashcard(UUIDModel):
    """A curriculum-aligned flashcard authored by a teacher.

    Bilingual (``front_ar``/``front_fr``, ``back_ar``/``back_fr``); text is
    stored verbatim and may embed LaTeX with dollar delimiters (see
    ``assessment.constants``). Reuses the ``Question`` status workflow.
    """

    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        IN_REVIEW = "IN_REVIEW", "In review"
        PUBLISHED = "PUBLISHED", "Published"
        RETIRED = "RETIRED", "Retired"

    topic = models.ForeignKey(
        "planner.Topic",
        on_delete=models.PROTECT,
        related_name="flashcards",
    )
    objective = models.ForeignKey(
        "planner.LearningObjective",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="flashcards",
    )
    curriculum_version = models.ForeignKey(
        "planner.CurriculumVersion",
        on_delete=models.PROTECT,
        related_name="flashcards",
    )
    front_ar = models.TextField(blank=True, default="")
    front_fr = models.TextField(blank=True, default="")
    back_ar = models.TextField(blank=True, default="")
    back_fr = models.TextField(blank=True, default="")
    image = models.ImageField(
        upload_to="assessment/flashcards/", null=True, blank=True
    )
    difficulty = models.PositiveSmallIntegerField(
        default=3,
        validators=[MinValueValidator(DIFFICULTY_MIN), MaxValueValidator(DIFFICULTY_MAX)],
    )
    status = models.CharField(
        max_length=10, choices=Status.choices, default=Status.DRAFT
    )
    author = models.ForeignKey(
        "users.Teacher",
        on_delete=models.PROTECT,
        related_name="authored_flashcards",
    )
    reviewer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="reviewed_flashcards",
    )
    is_sample = models.BooleanField(default=False)
    source_note = models.CharField(max_length=255, blank=True, default="")
    external_id = models.CharField(
        max_length=200, null=True, blank=True, unique=True
    )
    review_comment = models.TextField(blank=True, default="")
    reviewed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at", "id"]
        indexes = [
            models.Index(fields=["topic", "status"]),
            models.Index(fields=["status"]),
            models.Index(fields=["author"]),
        ]
        constraints = [
            models.CheckConstraint(
                check=models.Q(difficulty__gte=DIFFICULTY_MIN)
                & models.Q(difficulty__lte=DIFFICULTY_MAX),
                name="assessment_flashcard_difficulty_range",
            ),
        ]

    def __str__(self) -> str:
        label = (self.front_fr or self.front_ar or "").strip()[:60]
        return label or f"Flashcard {self.uuid}"

    def save(self, *args, **kwargs):
        if self.external_id == "":
            self.external_id = None
        super().save(*args, **kwargs)

    @property
    def front_languages(self) -> list[str]:
        return [lang for lang in ("ar", "fr") if getattr(self, f"front_{lang}").strip()]

    @property
    def back_languages(self) -> list[str]:
        return [lang for lang in ("ar", "fr") if getattr(self, f"back_{lang}").strip()]

    def validate_publishable(self) -> None:
        """Enforce publish-time content rules. Raises ``ValidationError``."""
        errors: dict[str, str] = {}
        if self.topic_id is None:
            errors["topic"] = "A topic is required to publish."
        if not self.front_languages:
            errors["front"] = "Provide the front in at least one language."
        if not self.back_languages:
            errors["back"] = "Provide the back in at least one language."
        if errors:
            raise ValidationError(errors)

    # -- workflow (mirrors Question) ------------------------------------------

    def submit_for_review(self) -> None:
        if self.status != self.Status.DRAFT:
            raise ValidationError(
                {"status": "Only a DRAFT flashcard can be submitted for review."}
            )
        self.validate_publishable()
        self.status = self.Status.IN_REVIEW
        self.review_comment = ""
        self.reviewed_at = None
        self.save(update_fields=["status", "review_comment", "reviewed_at", "updated_at"])

    def publish(self, reviewer, comment: str = "") -> None:
        if self.status != self.Status.IN_REVIEW:
            raise ValidationError(
                {"status": "Only a flashcard IN_REVIEW can be published."}
            )
        self.validate_publishable()
        self.status = self.Status.PUBLISHED
        self.reviewer = reviewer
        self.review_comment = comment.strip()
        self.reviewed_at = timezone.now()
        self.save(
            update_fields=[
                "status",
                "reviewer",
                "review_comment",
                "reviewed_at",
                "updated_at",
            ]
        )

    def reject(self, reviewer, comment: str) -> None:
        if self.status != self.Status.IN_REVIEW:
            raise ValidationError(
                {"status": "Only a flashcard IN_REVIEW can be rejected."}
            )
        if not (comment or "").strip():
            raise ValidationError({"comment": "A rejection comment is required."})
        self.status = self.Status.DRAFT
        self.reviewer = reviewer
        self.review_comment = comment.strip()
        self.reviewed_at = timezone.now()
        self.save(
            update_fields=[
                "status",
                "reviewer",
                "review_comment",
                "reviewed_at",
                "updated_at",
            ]
        )

    def retire(self, reviewer, comment: str = "") -> None:
        if self.status != self.Status.PUBLISHED:
            raise ValidationError(
                {"status": "Only a PUBLISHED flashcard can be retired."}
            )
        self.status = self.Status.RETIRED
        self.reviewer = reviewer
        if (comment or "").strip():
            self.review_comment = comment.strip()
        self.reviewed_at = timezone.now()
        self.save(
            update_fields=["status", "reviewer", "review_comment", "reviewed_at", "updated_at"]
        )


class FlashcardState(UUIDModel):
    """Per-student scheduling state for one flashcard (Leitner box).

    ``due_at`` is ``None`` for a card the student has never reviewed, which
    makes it "new" and immediately due. ``box`` starts at 1.
    """

    student = models.ForeignKey(
        "users.Student", on_delete=models.CASCADE, related_name="flashcard_states"
    )
    card = models.ForeignKey(
        Flashcard, on_delete=models.CASCADE, related_name="states"
    )
    box = models.PositiveSmallIntegerField(default=1)
    due_at = models.DateTimeField(null=True, blank=True)
    last_reviewed_at = models.DateTimeField(null=True, blank=True)
    streak = models.PositiveIntegerField(default=0)
    lapses = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["due_at", "id"]
        verbose_name_plural = "flashcard states"
        indexes = [
            models.Index(fields=["student", "due_at"]),
            models.Index(fields=["student", "card"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["student", "card"],
                name="assessment_unique_flashcard_state",
            ),
            models.CheckConstraint(
                check=models.Q(box__gte=1),
                name="assessment_flashcard_state_box_positive",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.student_id}/{self.card_id} box={self.box}"


class FlashcardReview(UUIDModel):
    """One review event for a (student, card) pair.

    ``client_review_id`` makes a review idempotent so an offline client can
    safely replay a queued review without double-counting it.
    """

    class Rating(models.TextChoices):
        AGAIN = "AGAIN", "Again"
        HARD = "HARD", "Hard"
        GOOD = "GOOD", "Good"
        EASY = "EASY", "Easy"

    student = models.ForeignKey(
        "users.Student", on_delete=models.CASCADE, related_name="flashcard_reviews"
    )
    card = models.ForeignKey(
        Flashcard, on_delete=models.CASCADE, related_name="reviews"
    )
    rating = models.CharField(max_length=8, choices=Rating.choices)
    reviewed_at = models.DateTimeField()
    response_ms = models.PositiveIntegerField(null=True, blank=True)
    client_review_id = models.CharField(max_length=128, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-reviewed_at", "id"]
        indexes = [
            models.Index(fields=["student", "card", "reviewed_at"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["student", "client_review_id"],
                name="assessment_unique_flashcard_review_client_id",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.student_id}/{self.card_id} {self.rating}"


class TeacherGrade(UUIDModel):
    """A teacher-entered grade for a student in one subject (Phase A10).

    Used only by the staff calibration report (readiness vs teacher grades). One
    current grade per (student, subject); a newer entry replaces the old one.
    """

    student = models.ForeignKey(
        "users.Student", on_delete=models.CASCADE, related_name="teacher_grades"
    )
    subject = models.CharField(max_length=150)
    score = models.FloatField()
    max_score = models.FloatField(default=100.0)
    recorded_by = models.ForeignKey(
        "users.Teacher",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="recorded_grades",
    )
    recorded_at = models.DateTimeField()
    source_note = models.CharField(max_length=255, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["student", "subject", "id"]
        indexes = [models.Index(fields=["subject"])]
        constraints = [
            models.UniqueConstraint(
                fields=["student", "subject"],
                name="assessment_unique_teacher_grade",
            ),
            models.CheckConstraint(
                check=models.Q(max_score__gt=0) & models.Q(score__gte=0),
                name="assessment_teacher_grade_range",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.student_id}/{self.subject}={self.score}/{self.max_score}"

    @property
    def ratio(self) -> float:
        return float(self.score) / float(self.max_score) if self.max_score else 0.0
