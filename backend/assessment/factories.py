"""Plain-Python factories for assessment tests.

No ``factory_boy`` dependency (CI installs only ``requirements-dev.txt``). Each
helper returns a saved model instance and takes keyword overrides.
"""

from __future__ import annotations

import uuid
from datetime import date
from types import SimpleNamespace

from django.utils import timezone
from planner.models import (
    AcademicYear,
    Chapter,
    CurriculumVersion,
    LearningObjective,
    Topic,
)
from users.models import Teacher, User

from .models import (
    Evidence,
    Flashcard,
    FlashcardReview,
    FlashcardState,
    Misconception,
    NumericAnswerSpec,
    Question,
    QuestionOption,
    Quiz,
    QuizAttempt,
)

#: Fixed placeholder uuids matching ``fixtures/questions.sample.json``.
SAMPLE_CURRICULUM_UUID = uuid.UUID("00000000-0000-0000-0000-0000000000a1")
SAMPLE_TOPIC_UUID = uuid.UUID("00000000-0000-0000-0000-0000000000b1")


def _suffix() -> str:
    return uuid.uuid4().hex[:8]


def make_user(*, role: str = "teacher", is_staff: bool = False, username=None, **extra) -> User:
    username = username or f"assess-{_suffix()}"
    return User.objects.create_user(
        username=username,
        email=f"{username}@example.com",
        password="pass12345",
        role=role,
        is_staff=is_staff,
        **extra,
    )


def make_teacher(*, user: User | None = None, username=None, **extra) -> Teacher:
    user = user or make_user(role="teacher", username=username, **extra)
    return Teacher.objects.create(user=user)


def make_staff(*, username=None) -> User:
    return make_user(role="teacher", is_staff=True, username=username)


def make_curriculum(
    *,
    curriculum_uuid: uuid.UUID | None = None,
    topic_uuid: uuid.UUID | None = None,
    label=None,
) -> SimpleNamespace:
    """Create an AcademicYear -> CurriculumVersion -> Chapter -> Topic chain."""
    year = AcademicYear.objects.create(
        label=label or f"year-{_suffix()}",
        start_date=date(2090, 9, 1),
        end_date=date(2091, 6, 30),
    )
    curriculum = CurriculumVersion(
        academic_year=year,
        level="PLACEHOLDER",
        stream="PLACEHOLDER",
        status=CurriculumVersion.Status.DRAFT,
    )
    if curriculum_uuid is not None:
        curriculum.uuid = curriculum_uuid
    curriculum.save()

    chapter = Chapter.objects.create(
        curriculum=curriculum,
        subject="رياضيات",
        order=1,
        title_ar="فصل",
        title_fr="Chapter",
    )
    topic = Topic(chapter=chapter, order=1, title_ar="موضوع", title_fr="Topic")
    if topic_uuid is not None:
        topic.uuid = topic_uuid
    topic.save()

    objective = LearningObjective.objects.create(
        topic=topic, order=1, text_ar="هدف", text_fr="Objective"
    )
    return SimpleNamespace(
        year=year,
        curriculum=curriculum,
        chapter=chapter,
        topic=topic,
        objective=objective,
    )


def make_question(
    *,
    topic: Topic,
    curriculum: CurriculumVersion | None = None,
    author: Teacher | None = None,
    kind: str = Question.Kind.MCQ_SINGLE,
    status: str = Question.Status.DRAFT,
    **overrides,
) -> Question:
    fields = {
        "prompt_ar": "سؤال تجريبي",
        "prompt_fr": "Placeholder question",
        "explanation_ar": "شرح تجريبي",
        "explanation_fr": "Placeholder explanation",
        "difficulty": 3,
    }
    fields.update(overrides)
    return Question.objects.create(
        author=author or make_teacher(),
        topic=topic,
        curriculum_version=curriculum or topic.chapter.curriculum,
        kind=kind,
        status=status,
        **fields,
    )


def make_option(
    *,
    question: Question,
    text: str = "Option",
    is_correct: bool = False,
    order: int = 0,
    misconception: Misconception | None = None,
) -> QuestionOption:
    return QuestionOption.objects.create(
        question=question,
        text_ar=text,
        text_fr=text,
        is_correct=is_correct,
        order=order,
        misconception=misconception,
    )


def make_choice_question(
    *,
    topic: Topic,
    kind: str = Question.Kind.MCQ_SINGLE,
    correct_index: int = 0,
    option_count: int = 3,
    author: Teacher | None = None,
    **overrides,
) -> Question:
    question = make_question(topic=topic, kind=kind, author=author, **overrides)
    for index in range(option_count):
        make_option(
            question=question,
            text=f"Option {index + 1}",
            is_correct=index == correct_index,
            order=index + 1,
        )
    return question


def make_numeric_question(
    *, topic: Topic, author: Teacher | None = None, **overrides
) -> Question:
    question = make_question(
        topic=topic, kind=Question.Kind.NUMERIC, author=author, **overrides
    )
    NumericAnswerSpec.objects.create(
        question=question, correct_value="3.14", tolerance_abs="0.01"
    )
    return question


def make_quiz(
    *,
    author: Teacher | None = None,
    kind: str = Quiz.Kind.TOPIC_PRACTICE,
    title: str = "Placeholder quiz",
    subject: str = "",
    chapter: Chapter | None = None,
    topic: Topic | None = None,
    config: dict | None = None,
    is_active: bool = True,
) -> Quiz:
    return Quiz.objects.create(
        author=author or make_teacher(),
        kind=kind,
        title=title,
        subject=subject,
        chapter=chapter,
        topic=topic,
        config=config
        if config is not None
        else {"num_questions": 5, "time_limit": None, "difficulty_range": [1, 5]},
        is_active=is_active,
    )


def make_attempt(
    *,
    student,
    quiz: Quiz,
    question_ids=None,
    seed: int = 1,
    status: str = QuizAttempt.Status.IN_PROGRESS,
    score=None,
) -> QuizAttempt:
    return QuizAttempt.objects.create(
        student=student,
        quiz=quiz,
        question_ids=[str(qid) for qid in (question_ids or [])],
        seed=seed,
        status=status,
        score=score,
    )


def make_evidence(
    *,
    student,
    topic: Topic,
    source: str = Evidence.Source.QUIZ,
    source_ref_type: str = "quiz_attempt",
    source_ref_id: str = "ref",
    score="1.0",
    difficulty: int = 3,
    occurred_at=None,
    question: Question | None = None,
    weight_modifier: float = 1.0,
) -> Evidence:
    return Evidence.objects.create(
        student=student,
        topic=topic,
        source=source,
        source_ref_type=source_ref_type,
        source_ref_id=source_ref_id,
        score=score,
        difficulty=difficulty,
        occurred_at=occurred_at or timezone.now(),
        question=question,
        weight_modifier=weight_modifier,
    )


def make_flashcard(
    *,
    topic: Topic,
    curriculum: CurriculumVersion | None = None,
    author: Teacher | None = None,
    status: str = Flashcard.Status.DRAFT,
    **overrides,
) -> Flashcard:
    fields = {
        "front_ar": "وجه السؤال",
        "front_fr": "Placeholder front",
        "back_ar": "ظهر الجواب",
        "back_fr": "Placeholder back",
        "difficulty": 3,
    }
    fields.update(overrides)
    return Flashcard.objects.create(
        author=author or make_teacher(),
        topic=topic,
        curriculum_version=curriculum or topic.chapter.curriculum,
        status=status,
        **fields,
    )


def make_flashcard_state(
    *,
    student,
    card: Flashcard,
    box: int = 1,
    due_at=None,
    streak: int = 0,
    lapses: int = 0,
    last_reviewed_at=None,
) -> FlashcardState:
    return FlashcardState.objects.create(
        student=student,
        card=card,
        box=box,
        due_at=due_at,
        streak=streak,
        lapses=lapses,
        last_reviewed_at=last_reviewed_at,
    )


def make_flashcard_review(
    *,
    student,
    card: Flashcard,
    rating: str = FlashcardReview.Rating.GOOD,
    reviewed_at=None,
    client_review_id: str | None = None,
    response_ms: int | None = None,
) -> FlashcardReview:
    return FlashcardReview.objects.create(
        student=student,
        card=card,
        rating=rating,
        reviewed_at=reviewed_at or timezone.now(),
        client_review_id=client_review_id,
        response_ms=response_ms,
    )
