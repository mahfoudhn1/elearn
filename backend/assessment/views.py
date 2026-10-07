"""DRF views for assessment content.

* ``QuestionViewSet`` -- teacher authoring CRUD + workflow actions. Students get
  read-only access to PUBLISHED questions through a response shape that strips
  every correct flag.
* ``MisconceptionViewSet`` -- teacher/staff writes, everyone reads.
* ``StaffQuestionImportView`` -- staff-only bulk import (CSV or JSON) with a
  dry-run mode that reports row errors without writing.
"""

from __future__ import annotations

import json

from django.core.exceptions import ValidationError as DjangoValidationError
from django.db.models import Q
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from core.views import UUIDLookupMixin
from courses.permissions import get_student, get_teacher
from planner.models import Chapter, Topic
from planner.permissions import HasStudentProfile
from users.models import Teacher

from . import services, services_adaptive, services_flashcards, services_mastery
from .importers import import_questions, parse_csv
from .models import (
    Flashcard,
    FlashcardsRuleSet,
    FlashcardState,
    MasteryRuleSet,
    Misconception,
    Question,
    Quiz,
    QuizAttempt,
)
from .permissions import IsTeacherOrStaff, QuestionPermission, is_author
from .serializers import (
    AnswerInputSerializer,
    AttemptStartSerializer,
    FlashcardReviewInputSerializer,
    FlashcardRuleSetSerializer,
    FlashcardSerializer,
    FlashcardStateSerializer,
    FlashcardTeacherSerializer,
    FlashcardWriteSerializer,
    MasteryRuleSetSerializer,
    MisconceptionSerializer,
    QuestionAttemptSerializer,
    QuestionStudentSerializer,
    QuestionTeacherSerializer,
    QuestionWriteSerializer,
    QuizSerializer,
    QuizWriteSerializer,
    ReviewDecisionSerializer,
    TopicMasterySerializer,
)

def _raise_validation(exc: DjangoValidationError) -> None:
    raise ValidationError(getattr(exc, "message_dict", exc.messages))


class QuestionViewSet(UUIDLookupMixin, viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, QuestionPermission]

    def get_queryset(self):
        user = self.request.user
        teacher = get_teacher(user)

        base = Question.objects.select_related(
            "topic",
            "objective",
            "curriculum_version",
            "author__user",
            "reviewer",
        ).prefetch_related("options", "options__misconception")

        if user.is_staff:
            queryset = base
        elif teacher is not None:
            queryset = base.filter(Q(author=teacher) | Q(status=Question.Status.PUBLISHED))
        else:
            queryset = base.filter(status=Question.Status.PUBLISHED)

        params = self.request.query_params
        if params.get("topic"):
            queryset = queryset.filter(topic__uuid=params["topic"])
        if params.get("kind"):
            queryset = queryset.filter(kind=params["kind"])
        if params.get("difficulty"):
            queryset = queryset.filter(difficulty=params["difficulty"])
        if params.get("is_sample") is not None and params.get("is_sample") != "":
            queryset = queryset.filter(is_sample=params["is_sample"].lower() in ("1", "true"))
        if params.get("external_id"):
            queryset = queryset.filter(external_id=params["external_id"])
        if params.get("search"):
            term = params["search"]
            queryset = queryset.filter(
                Q(prompt_ar__icontains=term) | Q(prompt_fr__icontains=term)
            )
        # Status filtering is only meaningful for authors/reviewers.
        if params.get("status") and (user.is_staff or teacher is not None):
            queryset = queryset.filter(status=params["status"])
        return queryset

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return QuestionWriteSerializer
        user = self.request.user
        if user.is_staff or get_teacher(user) is not None:
            return QuestionTeacherSerializer
        return QuestionStudentSerializer

    def perform_create(self, serializer):
        teacher = get_teacher(self.request.user)
        if teacher is None:
            raise PermissionDenied("Only teachers can author questions.")
        serializer.save(author=teacher)

    def _ensure_editable(self, question):
        """Authors may only edit DRAFT; reviewers (staff) may edit anything."""
        if self.request.user.is_staff:
            return
        if not is_author(self.request.user, question):
            raise PermissionDenied("You can only edit your own questions.")
        if question.status != Question.Status.DRAFT:
            raise PermissionDenied("Only DRAFT questions can be edited.")

    def update(self, request, *args, **kwargs):
        self._ensure_editable(self.get_object())
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        self._ensure_editable(self.get_object())
        return super().partial_update(request, *args, **kwargs)

    def perform_destroy(self, instance):
        self._ensure_editable(instance)
        instance.delete()

    # -- workflow --------------------------------------------------------------

    @action(detail=True, methods=["post"], url_path="submit-for-review")
    def submit_for_review(self, request, pk=None):
        question = self.get_object()
        if not is_author(request.user, question):
            raise PermissionDenied("Only the author can submit this question for review.")
        try:
            question.submit_for_review()
        except DjangoValidationError as exc:
            _raise_validation(exc)
        return Response(self.get_serializer(question).data)

    @action(detail=True, methods=["post"])
    def publish(self, request, pk=None):
        self._require_reviewer(request)
        question = self.get_object()
        serializer = ReviewDecisionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            question.publish(request.user, serializer.validated_data.get("comment", ""))
        except DjangoValidationError as exc:
            _raise_validation(exc)
        return Response(self.get_serializer(question).data)

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        self._require_reviewer(request)
        question = self.get_object()
        serializer = ReviewDecisionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            question.reject(request.user, serializer.validated_data.get("comment", ""))
        except DjangoValidationError as exc:
            _raise_validation(exc)
        return Response(self.get_serializer(question).data)

    @action(detail=True, methods=["post"])
    def retire(self, request, pk=None):
        self._require_reviewer(request)
        question = self.get_object()
        serializer = ReviewDecisionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            question.retire(request.user, serializer.validated_data.get("comment", ""))
        except DjangoValidationError as exc:
            _raise_validation(exc)
        return Response(self.get_serializer(question).data)

    @staticmethod
    def _require_reviewer(request):
        if not request.user.is_staff:
            raise PermissionDenied("Only reviewers can perform this action.")


class MisconceptionViewSet(UUIDLookupMixin, viewsets.ModelViewSet):
    serializer_class = MisconceptionSerializer
    permission_classes = [IsAuthenticated, IsTeacherOrStaff]

    def get_queryset(self):
        queryset = Misconception.objects.select_related("topic")
        topic = self.request.query_params.get("topic")
        if topic:
            queryset = queryset.filter(topic__uuid=topic)
        search = self.request.query_params.get("search")
        if search:
            queryset = queryset.filter(code__icontains=search)
        return queryset


class StaffQuestionImportView(APIView):
    """Bulk question import. Accepts an uploaded file or an inline document.

    Teachers import as themselves (their own author profile); staff reviewers may
    target any teacher via the ``author`` field. ``dry_run`` validates and writes
    nothing.
    """

    permission_classes = [IsAuthenticated, IsAdminUser]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def post(self, request):
        dry_run = str(request.data.get("dry_run", "")).lower() in ("1", "true", "yes")
        if request.query_params.get("dry_run") in ("1", "true", "yes"):
            dry_run = True

        author = None
        author_ref = request.data.get("author")
        if author_ref:
            author = Teacher.objects.filter(uuid=author_ref).first()
            if author is None:
                raise ValidationError({"author": f"Teacher {author_ref} not found."})
        if author is None:
            author = getattr(request.user, "teacher", None)
        if author is None:
            raise ValidationError(
                {"author": "Provide a teacher uuid in 'author' (this reviewer has no teacher profile)."}
            )
        # A non-staff teacher may only import as themselves.
        if not request.user.is_staff:
            own_teacher = getattr(request.user, "teacher", None)
            if own_teacher is None or author.id != own_teacher.id:
                raise PermissionDenied("Teachers can only import as themselves.")

        document = self._read_document(request)
        report = import_questions(document, author=author, dry_run=dry_run)
        return Response(report.as_dict(), status=status.HTTP_200_OK)

    @staticmethod
    def _read_document(request):
        upload = request.FILES.get("file")
        if upload is not None:
            try:
                text = upload.read().decode("utf-8")
            except UnicodeDecodeError as exc:
                raise ValidationError({"file": "File must be UTF-8 text."}) from exc
            if upload.name.lower().endswith(".csv"):
                try:
                    return parse_csv(text)
                except ValueError as exc:
                    raise ValidationError({"file": str(exc)}) from exc
            try:
                return json.loads(text)
            except json.JSONDecodeError as exc:
                raise ValidationError({"file": f"Invalid JSON: {exc}"}) from exc

        document = request.data.get("document")
        if isinstance(document, str):
            try:
                document = json.loads(document)
            except json.JSONDecodeError as exc:
                raise ValidationError({"document": f"Invalid JSON: {exc}"}) from exc
        if document is None and ("questions" in request.data or "misconceptions" in request.data):
            document = request.data
        if document is None:
            raise ValidationError({"document": "Provide 'file' or a 'document' payload."})
        return document


# --- Quizzes & attempts -------------------------------------------------------


class QuizViewSet(UUIDLookupMixin, viewsets.ModelViewSet):
    """Teacher-authored quizzes. Students see active quizzes read-only."""

    permission_classes = [IsAuthenticated, IsTeacherOrStaff]

    def get_queryset(self):
        teacher = get_teacher(self.request.user)
        queryset = Quiz.objects.select_related("author__user", "chapter", "topic")
        if teacher is not None:
            return queryset.filter(Q(author=teacher) | Q(is_active=True))
        return queryset.filter(is_active=True)

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return QuizWriteSerializer
        return QuizSerializer

    def perform_create(self, serializer):
        teacher = get_teacher(self.request.user)
        if teacher is None:
            raise PermissionDenied("Only teachers can create quizzes.")
        serializer.save(author=teacher)


def _get_attempt(request, pk) -> QuizAttempt:
    student = get_student(request.user)
    attempt = (
        QuizAttempt.objects.select_related("quiz")
        .filter(student=student, uuid=pk)
        .first()
        if student is not None
        else None
    )
    if attempt is None:
        raise NotFound("Attempt not found.")
    return attempt


def _ordered_questions(attempt: QuizAttempt) -> list[Question]:
    """The attempt's questions in the stored order (student-safe)."""
    questions = {
        str(question.uuid): question
        for question in Question.objects.filter(uuid__in=attempt.question_ids).prefetch_related(
            "options"
        )
    }
    return [questions[qid] for qid in attempt.question_ids if qid in questions]


def _attempt_meta(attempt: QuizAttempt) -> dict:
    return {
        "id": str(attempt.uuid),
        "quiz": str(attempt.quiz.uuid),
        "quiz_kind": attempt.quiz.kind,
        "status": attempt.status,
        "started_at": attempt.started_at,
        "submitted_at": attempt.submitted_at,
        "expires_at": services.expires_at(attempt),
        "score": attempt.score,
        "max_score": len(attempt.question_ids),
        "question_count": len(attempt.question_ids),
    }


class AttemptStartView(APIView):
    """Start (or resume) an attempt. Never returns correct flags."""

    permission_classes = [IsAuthenticated, HasStudentProfile]
    # Abuse protection: bound how fast a client can create attempts.
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "attempt_start"

    def post(self, request):
        serializer = AttemptStartSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        quiz = Quiz.objects.filter(uuid=serializer.validated_data["quiz"]).first()
        if quiz is None:
            raise NotFound("Quiz not found.")
        student = get_student(request.user)
        try:
            attempt, created = services.start_attempt(
                student, quiz, seed=serializer.validated_data.get("seed")
            )
        except services.AttemptError as exc:
            raise ValidationError({"detail": str(exc)})

        payload = _attempt_meta(attempt)
        payload["questions"] = QuestionAttemptSerializer(
            _ordered_questions(attempt), many=True, context={"request": request}
        ).data
        return Response(
            payload,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class AttemptAnswerView(APIView):
    """Submit (or revise) one answer; server grades it."""

    permission_classes = [IsAuthenticated, HasStudentProfile]

    def post(self, request, pk):
        attempt = _get_attempt(request, pk)
        serializer = AnswerInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        question = Question.objects.filter(
            uuid=serializer.validated_data["question"]
        ).first()
        if question is None:
            raise NotFound("Question not found.")

        try:
            answer, _result = services.record_answer(
                attempt,
                question,
                serializer.validated_data.get("response"),
                time_spent_s=serializer.validated_data.get("time_spent_s"),
                hint_used=serializer.validated_data.get("hint_used", False),
            )
        except services.AttemptError as exc:
            raise ValidationError({"detail": str(exc)})

        payload = {"attempt": str(attempt.uuid), "question": str(question.uuid)}
        payload.update(services.answer_feedback(attempt, answer))
        return Response(payload)


class AttemptSubmitView(APIView):
    """Finalise the attempt and compute its score."""

    permission_classes = [IsAuthenticated, HasStudentProfile]

    def post(self, request, pk):
        attempt = _get_attempt(request, pk)
        try:
            services.submit_attempt(attempt)
        except services.AttemptError as exc:
            raise ValidationError({"detail": str(exc)})
        return Response(_attempt_meta(attempt))


class AttemptNextView(APIView):
    """Adaptive (DIAGNOSTIC) selection: return the next question or a stop.

    Idempotent per call while unanswered: repeatedly calling ``next`` without
    answering returns the same pending question (it is the last one appended to
    ``question_ids`` and has no answer yet).
    """

    permission_classes = [IsAuthenticated, HasStudentProfile]

    def post(self, request, pk):
        attempt = _get_attempt(request, pk)
        services.expire_if_needed(attempt)
        if attempt.status != QuizAttempt.Status.IN_PROGRESS:
            raise ValidationError({"detail": "This attempt is no longer in progress."})
        if not services_adaptive.is_adaptive(attempt.quiz):
            raise ValidationError({"detail": "This quiz is not adaptive."})

        # If the last served question is unanswered, return it unchanged.
        pending = _pending_question(attempt)
        if pending is not None:
            return Response(
                {
                    "stopped": False,
                    "question": QuestionAttemptSerializer(
                        pending, context={"request": request}
                    ).data,
                    "asked_count": len(attempt.question_ids or []),
                }
            )

        question, decision = services_adaptive.select_next(attempt)
        if question is None:
            return Response(
                {
                    "stopped": True,
                    "stop_reason": decision.stop_reason,
                    "insufficient_topics": list(decision.insufficient_topics),
                    "reasons": [
                        {"code": reason.code, "params": dict(reason.params)}
                        for reason in decision.reasons
                    ],
                    "asked_count": len(attempt.question_ids or []),
                }
            )
        return Response(
            {
                "stopped": False,
                "question": QuestionAttemptSerializer(
                    question, context={"request": request}
                ).data,
                "reasons": [
                    {"code": reason.code, "params": dict(reason.params)}
                    for reason in decision.reasons
                ],
                "asked_count": len(attempt.question_ids or []),
            }
        )


def _pending_question(attempt: QuizAttempt):
    """The last served question if it has not been answered yet."""
    if not attempt.question_ids:
        return None
    answered = set(
        attempt.answers.values_list("question__uuid", flat=True)
    )
    last_id = attempt.question_ids[-1]
    if last_id in {str(value) for value in answered}:
        return None
    return Question.objects.filter(uuid=last_id).prefetch_related("options").first()


class AttemptResultView(APIView):
    """The attempt's questions, the student's answers and (when allowed) feedback."""

    permission_classes = [IsAuthenticated, HasStudentProfile]

    def get(self, request, pk):
        attempt = _get_attempt(request, pk)
        services.expire_if_needed(attempt)
        withhold = services.feedback_withheld(attempt)
        answers = {
            str(answer.question.uuid): answer
            for answer in attempt.answers.select_related("question")
        }

        rows = []
        for question in _ordered_questions(attempt):
            answer = answers.get(str(question.uuid))
            row = {
                "question": QuestionAttemptSerializer(
                    question, context={"request": request}
                ).data
            }
            if answer is None:
                row["answered"] = False
            elif withhold:
                row["answered"] = True
            else:
                row.update(
                    {
                        "answered": True,
                        "response": answer.response,
                        "is_correct": answer.is_correct,
                        "partial_score": answer.partial_score,
                        "time_spent_s": answer.time_spent_s,
                        "hint_used": answer.hint_used,
                        "explanation_ar": question.explanation_ar,
                        "explanation_fr": question.explanation_fr,
                    }
                )
            rows.append(row)

        payload = _attempt_meta(attempt)
        payload["feedback_available"] = not withhold
        payload["answers"] = rows
        if services_adaptive.is_adaptive(attempt.quiz):
            payload["diagnostic"] = services_adaptive.diagnostic_result(attempt)
        return Response(payload)


# --- Mastery & readiness (Phase A3) ------------------------------------------


def _require_student(request):
    student = get_student(request.user)
    if student is None:
        raise PermissionDenied("A student profile is required.")
    return student


class TopicMasteryListView(APIView):
    """Cached per-topic mastery for the requesting student, optionally by subject."""

    permission_classes = [IsAuthenticated, HasStudentProfile]

    def get(self, request):
        student = _require_student(request)
        subject = request.query_params.get("subject")
        chapter_ref = request.query_params.get("chapter")

        topics = Topic.objects.select_related("chapter")
        if subject:
            topics = topics.filter(chapter__subject=subject)
        if chapter_ref:
            topics = topics.filter(chapter__uuid=chapter_ref)

        entries = services_mastery.ensure_topic_mastery(student, list(topics))
        payload = [services_mastery.topic_mastery_dict(entry) for entry in entries]
        return Response(
            TopicMasterySerializer(payload, many=True).data
        )


class ChapterReadinessListView(APIView):
    """Chapter readiness for the requesting student, optionally by subject."""

    permission_classes = [IsAuthenticated, HasStudentProfile]

    def get(self, request):
        student = _require_student(request)
        subject = request.query_params.get("subject")
        chapters = Chapter.objects.all()
        if subject:
            chapters = chapters.filter(subject=subject)

        payload = []
        for chapter in chapters:
            result = services_mastery.compute_chapter_result(student, chapter)
            data = services_mastery._readiness_dict(result)
            data["chapter"] = str(chapter.uuid)
            data["subject"] = chapter.subject
            data["title_ar"] = chapter.title_ar
            data["title_fr"] = chapter.title_fr
            payload.append(data)
        return Response(payload)


class SubjectReadinessView(APIView):
    """Readiness for one subject, addressed by subject string."""

    permission_classes = [IsAuthenticated, HasStudentProfile]

    def get(self, request, subject):
        student = _require_student(request)
        result = services_mastery.compute_subject_result(student, subject)
        data = services_mastery._readiness_dict(result)
        data["subject"] = subject
        return Response(data)


class ReadinessOverviewView(APIView):
    """Readiness for every subject the student has evidence on."""

    permission_classes = [IsAuthenticated, HasStudentProfile]

    def get(self, request):
        student = _require_student(request)
        return Response(services_mastery.overview(student))


class CurriculumTopicsView(APIView):
    """Read-only chapter/topic titles for the mobile assessment screens.

    Returns chapters (with their topics) for a subject so the client can label
    the mastery heat list without a separate curriculum service. Student-scoped
    only for authentication; the catalogue itself is not personal.
    """

    permission_classes = [IsAuthenticated, HasStudentProfile]

    def get(self, request):
        subject = request.query_params.get("subject")
        chapter_qs = Chapter.objects.all().order_by("order", "id")
        if subject:
            chapter_qs = chapter_qs.filter(subject=subject)
        topic_qs = Topic.objects.filter(chapter__in=chapter_qs).order_by(
            "chapter__order", "order", "id"
        )
        topics_by_chapter: dict[int, list[dict]] = {}
        for topic in topic_qs:
            topics_by_chapter.setdefault(topic.chapter_id, []).append(
                {
                    "id": str(topic.uuid),
                    "title_ar": topic.title_ar,
                    "title_fr": topic.title_fr,
                    "order": topic.order,
                }
            )
        payload = [
            {
                "chapter": str(chapter.uuid),
                "id": str(chapter.uuid),
                "subject": chapter.subject,
                "title_ar": chapter.title_ar,
                "title_fr": chapter.title_fr,
                "order": chapter.order,
                "topics": topics_by_chapter.get(chapter.id, []),
            }
            for chapter in chapter_qs
        ]
        return Response(payload)


class MasteryRuleSetViewSet(UUIDLookupMixin, viewsets.ModelViewSet):
    """Staff-only management of mastery rule sets (mirrors planner's rule sets)."""

    queryset = MasteryRuleSet.objects.all()
    serializer_class = MasteryRuleSetSerializer
    permission_classes = [IsAdminUser]


# --- Flashcards (Phase A4) ----------------------------------------------------


class FlashcardViewSet(UUIDLookupMixin, viewsets.ModelViewSet):
    """Teacher-authored flashcards; students read published ones.

    Reuses ``QuestionPermission`` so authoring/workflow rules match questions:
    teachers create and edit their own DRAFTs; staff review/publish.
    """

    permission_classes = [IsAuthenticated, QuestionPermission]

    def get_queryset(self):
        user = self.request.user
        teacher = get_teacher(user)
        base = Flashcard.objects.select_related(
            "topic", "objective", "curriculum_version", "author__user", "reviewer"
        )
        if user.is_staff:
            queryset = base
        elif teacher is not None:
            queryset = base.filter(
                Q(author=teacher) | Q(status=Flashcard.Status.PUBLISHED)
            )
        else:
            queryset = base.filter(status=Flashcard.Status.PUBLISHED)

        params = self.request.query_params
        if params.get("topic"):
            queryset = queryset.filter(topic__uuid=params["topic"])
        if params.get("is_sample") not in (None, ""):
            queryset = queryset.filter(
                is_sample=params["is_sample"].lower() in ("1", "true")
            )
        if params.get("external_id"):
            queryset = queryset.filter(external_id=params["external_id"])
        if params.get("search"):
            term = params["search"]
            queryset = queryset.filter(
                Q(front_ar__icontains=term)
                | Q(front_fr__icontains=term)
                | Q(back_ar__icontains=term)
                | Q(back_fr__icontains=term)
            )
        if params.get("status") and (user.is_staff or teacher is not None):
            queryset = queryset.filter(status=params["status"])
        return queryset

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return FlashcardWriteSerializer
        user = self.request.user
        if user.is_staff or get_teacher(user) is not None:
            return FlashcardTeacherSerializer
        return FlashcardSerializer

    def perform_create(self, serializer):
        teacher = get_teacher(self.request.user)
        if teacher is None:
            raise PermissionDenied("Only teachers can author flashcards.")
        serializer.save(author=teacher)

    def _ensure_editable(self, card):
        if self.request.user.is_staff:
            return
        if not is_author(self.request.user, card):
            raise PermissionDenied("You can only edit your own flashcards.")
        if card.status != Flashcard.Status.DRAFT:
            raise PermissionDenied("Only DRAFT flashcards can be edited.")

    def update(self, request, *args, **kwargs):
        self._ensure_editable(self.get_object())
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        self._ensure_editable(self.get_object())
        return super().partial_update(request, *args, **kwargs)

    def perform_destroy(self, instance):
        self._ensure_editable(instance)
        instance.delete()

    @action(detail=True, methods=["post"], url_path="submit-for-review")
    def submit_for_review(self, request, pk=None):
        card = self.get_object()
        if not is_author(request.user, card):
            raise PermissionDenied("Only the author can submit this flashcard.")
        try:
            card.submit_for_review()
        except DjangoValidationError as exc:
            _raise_validation(exc)
        return Response(self.get_serializer(card).data)

    @action(detail=True, methods=["post"])
    def publish(self, request, pk=None):
        self._require_reviewer(request)
        card = self.get_object()
        serializer = ReviewDecisionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            card.publish(request.user, serializer.validated_data.get("comment", ""))
        except DjangoValidationError as exc:
            _raise_validation(exc)
        return Response(self.get_serializer(card).data)

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        self._require_reviewer(request)
        card = self.get_object()
        serializer = ReviewDecisionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            card.reject(request.user, serializer.validated_data.get("comment", ""))
        except DjangoValidationError as exc:
            _raise_validation(exc)
        return Response(self.get_serializer(card).data)

    @action(detail=True, methods=["post"])
    def retire(self, request, pk=None):
        self._require_reviewer(request)
        card = self.get_object()
        serializer = ReviewDecisionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            card.retire(request.user, serializer.validated_data.get("comment", ""))
        except DjangoValidationError as exc:
            _raise_validation(exc)
        return Response(self.get_serializer(card).data)

    @staticmethod
    def _require_reviewer(request):
        if not request.user.is_staff:
            raise PermissionDenied("Only reviewers can perform this action.")


class FlashcardDueView(APIView):
    """Cards due for review for the requesting student."""

    permission_classes = [IsAuthenticated, HasStudentProfile]

    def get(self, request):
        student = _require_student(request)
        topic = None
        topic_ref = request.query_params.get("topic")
        if topic_ref:
            topic = Topic.objects.filter(uuid=topic_ref).first()
            if topic is None:
                raise NotFound("Topic not found.")
        limit = request.query_params.get("limit")
        try:
            limit = int(limit) if limit not in (None, "") else None
        except (TypeError, ValueError) as exc:
            raise ValidationError({"limit": "limit must be an integer."}) from exc
        if limit is not None and limit < 0:
            raise ValidationError({"limit": "limit must be non-negative."})

        new_cards, review_cards = services_flashcards.due_cards(
            student, topic=topic, limit=limit
        )
        states = {
            state.card_id: state
            for state in FlashcardState.objects.filter(
                student=student,
                card_id__in=[card.id for card in new_cards + review_cards],
            )
        }
        cards = [
            {
                "card": FlashcardSerializer(card, context={"request": request}).data,
                "state": (
                    FlashcardStateSerializer(states[card.id]).data
                    if card.id in states
                    else None
                ),
                "is_new": card.id not in states,
            }
            for card in new_cards + review_cards
        ]
        return Response(
            {
                "new_count": len(new_cards),
                "review_count": len(review_cards),
                "cards": cards,
            }
        )


class FlashcardReviewView(APIView):
    """Record one review (idempotent via ``client_review_id``)."""

    permission_classes = [IsAuthenticated, HasStudentProfile]

    def post(self, request, pk):
        student = _require_student(request)
        card = Flashcard.objects.filter(uuid=pk).first()
        if card is None:
            raise NotFound("Flashcard not found.")
        if card.status != Flashcard.Status.PUBLISHED:
            raise NotFound("Flashcard not found.")

        serializer = FlashcardReviewInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            review, state, replay = services_flashcards.record_review(
                student,
                card,
                serializer.validated_data["rating"],
                client_review_id=serializer.validated_data.get("client_review_id"),
                response_ms=serializer.validated_data.get("response_ms"),
                reviewed_at=serializer.validated_data.get("reviewed_at"),
            )
        except services_flashcards.FlashcardError as exc:
            raise ValidationError({"detail": str(exc)})

        return Response(
            {
                "review_id": str(review.uuid),
                "card": str(card.uuid),
                "rating": review.rating,
                "replay": replay,
                "box": state.box if state else None,
                "due_at": state.due_at if state else None,
                "streak": state.streak if state else None,
                "lapses": state.lapses if state else None,
            }
        )


class FlashcardStatsView(APIView):
    """Review stats for the requesting student."""

    permission_classes = [IsAuthenticated, HasStudentProfile]

    def get(self, request):
        student = _require_student(request)
        return Response(services_flashcards.stats(student))


class FlashcardsRuleSetViewSet(UUIDLookupMixin, viewsets.ModelViewSet):
    """Staff-only management of Leitner rule sets."""

    queryset = FlashcardsRuleSet.objects.all()
    serializer_class = FlashcardRuleSetSerializer
    permission_classes = [IsAdminUser]
