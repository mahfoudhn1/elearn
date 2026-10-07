"""Serializers for assessment content.

Three read shapes exist:

* ``QuestionWriteSerializer`` -- teacher authoring; nested options + numeric
  spec are written together with the question (options are a full replace).
* ``QuestionTeacherSerializer`` / reviewer -- includes ``is_correct``, the
  numeric key and the review fields.
* ``QuestionStudentSerializer`` -- published content only; strips every correct
  flag and answer key.
"""

from __future__ import annotations

from django.db import transaction
from rest_framework import serializers

from core.serializers import UUIDModelSerializer

from .models import (
    Flashcard,
    FlashcardsRuleSet,
    FlashcardReview,
    FlashcardState,
    MasteryRuleSet,
    Misconception,
    NumericAnswerSpec,
    Question,
    QuestionOption,
    Quiz,
    TeacherGrade,
    normalize_quiz_config,
)


class MisconceptionSerializer(UUIDModelSerializer):
    class Meta:
        model = Misconception
        fields = [
            "id",
            "topic",
            "code",
            "description_ar",
            "description_fr",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class QuestionOptionReadSerializer(UUIDModelSerializer):
    class Meta:
        model = QuestionOption
        fields = ["id", "text_ar", "text_fr", "is_correct", "misconception", "order"]


class QuestionOptionStudentSerializer(UUIDModelSerializer):
    """Student-safe option: no correctness, no misconception link."""

    class Meta:
        model = QuestionOption
        fields = ["id", "text_ar", "text_fr", "order"]


class NumericSpecReadSerializer(UUIDModelSerializer):
    class Meta:
        model = NumericAnswerSpec
        fields = ["id", "correct_value", "tolerance_abs", "tolerance_rel", "accepted_units"]


class NumericSpecStudentSerializer(UUIDModelSerializer):
    """Student-safe numeric spec: no correct value, no tolerance."""

    class Meta:
        model = NumericAnswerSpec
        fields = ["id", "accepted_units"]


class _QuestionBaseSerializer(UUIDModelSerializer):
    prompt_languages = serializers.SerializerMethodField()
    explanation_languages = serializers.SerializerMethodField()

    class Meta:
        model = Question
        fields = [
            "id",
            "topic",
            "objective",
            "curriculum_version",
            "kind",
            "prompt_ar",
            "prompt_fr",
            "image",
            "difficulty",
            "est_seconds",
            "explanation_ar",
            "explanation_fr",
            "status",
            "is_sample",
            "source_note",
            "created_at",
            "updated_at",
        ]

    def get_prompt_languages(self, obj) -> list[str]:
        return obj.prompt_languages

    def get_explanation_languages(self, obj) -> list[str]:
        return obj.explanation_languages


class QuestionTeacherSerializer(_QuestionBaseSerializer):
    options = QuestionOptionReadSerializer(many=True, read_only=True)
    numeric_spec = NumericSpecReadSerializer(read_only=True)

    class Meta(_QuestionBaseSerializer.Meta):
        fields = _QuestionBaseSerializer.Meta.fields + [
            "author",
            "reviewer",
            "external_id",
            "review_comment",
            "reviewed_at",
            "prompt_languages",
            "explanation_languages",
            "options",
            "numeric_spec",
        ]


class QuestionStudentSerializer(_QuestionBaseSerializer):
    options = QuestionOptionStudentSerializer(many=True, read_only=True)
    numeric_spec = NumericSpecStudentSerializer(read_only=True)

    class Meta(_QuestionBaseSerializer.Meta):
        fields = _QuestionBaseSerializer.Meta.fields + [
            "prompt_languages",
            "explanation_languages",
            "options",
            "numeric_spec",
        ]


class QuestionAttemptSerializer(UUIDModelSerializer):
    """Question payload served while an attempt is in progress.

    Excludes the explanation (which may reveal the answer), correct flags and
    the numeric key, so a quiz-start response leaks nothing.
    """

    prompt_languages = serializers.SerializerMethodField()
    options = QuestionOptionStudentSerializer(many=True, read_only=True)
    numeric_spec = NumericSpecStudentSerializer(read_only=True)

    class Meta:
        model = Question
        fields = [
            "id",
            "topic",
            "objective",
            "curriculum_version",
            "kind",
            "prompt_ar",
            "prompt_fr",
            "image",
            "difficulty",
            "est_seconds",
            "is_sample",
            "source_note",
            "prompt_languages",
            "options",
            "numeric_spec",
        ]

    def get_prompt_languages(self, obj) -> list[str]:
        return obj.prompt_languages


class QuestionOptionWriteSerializer(UUIDModelSerializer):
    class Meta:
        model = QuestionOption
        fields = ["text_ar", "text_fr", "is_correct", "misconception", "order"]


class NumericSpecWriteSerializer(UUIDModelSerializer):
    class Meta:
        model = NumericAnswerSpec
        fields = ["correct_value", "tolerance_abs", "tolerance_rel", "accepted_units"]


class QuestionWriteSerializer(UUIDModelSerializer):
    """Authoring serializer. ``status``/``author``/review fields are read-only."""

    options = QuestionOptionWriteSerializer(many=True, required=False)
    numeric_spec = NumericSpecWriteSerializer(required=False, allow_null=True)

    class Meta:
        model = Question
        fields = [
            "id",
            "topic",
            "objective",
            "curriculum_version",
            "kind",
            "prompt_ar",
            "prompt_fr",
            "image",
            "difficulty",
            "est_seconds",
            "explanation_ar",
            "explanation_fr",
            "status",
            "author",
            "reviewer",
            "external_id",
            "review_comment",
            "reviewed_at",
            "is_sample",
            "source_note",
            "created_at",
            "updated_at",
            "options",
            "numeric_spec",
        ]
        read_only_fields = [
            "id",
            "status",
            "author",
            "reviewer",
            "review_comment",
            "reviewed_at",
            "created_at",
            "updated_at",
        ]

    @staticmethod
    def _effective(attrs, instance, name):
        if name in attrs:
            return attrs[name]
        return getattr(instance, name, None)

    def validate(self, attrs):
        instance = self.instance
        errors: dict[str, str] = {}

        topic = self._effective(attrs, instance, "topic")
        objective = self._effective(attrs, instance, "objective")
        curriculum = self._effective(attrs, instance, "curriculum_version")
        kind = self._effective(attrs, instance, "kind")

        if topic is not None and curriculum is not None:
            if topic.chapter.curriculum_id != curriculum.id:
                errors["curriculum_version"] = (
                    "Must match the curriculum of the selected topic."
                )
        if objective is not None and topic is not None:
            if objective.topic_id != topic.id:
                errors["objective"] = "Must belong to the selected topic."

        if "options" in attrs:
            options = attrs["options"] or []
            if kind == Question.Kind.NUMERIC and options:
                errors["options"] = "Numeric questions must not define options."
            orders: list[int] = []
            for index, option in enumerate(options, start=1):
                order = option.get("order") or index
                orders.append(order)
                misconception = option.get("misconception")
                if (
                    misconception is not None
                    and topic is not None
                    and misconception.topic_id != topic.id
                ):
                    errors["options"] = (
                        "An option's misconception must belong to the question's topic."
                    )
            if len(set(orders)) != len(orders):
                errors["options"] = "Option order values must be unique."

        if "numeric_spec" in attrs and attrs.get("numeric_spec") is not None:
            if kind is not None and kind != Question.Kind.NUMERIC:
                errors["numeric_spec"] = (
                    "A numeric answer spec is only valid for NUMERIC questions."
                )

        if errors:
            raise serializers.ValidationError(errors)
        return attrs

    def _sync_options(self, question, options):
        for index, data in enumerate(options, start=1):
            data = dict(data)
            data["order"] = data.get("order") or index
            QuestionOption.objects.create(question=question, **data)

    def _sync_numeric(self, question, data):
        if data is None:
            NumericAnswerSpec.objects.filter(question=question).delete()
            return
        NumericAnswerSpec.objects.update_or_create(question=question, defaults=data)

    @transaction.atomic
    def create(self, validated_data):
        options = validated_data.pop("options", None)
        # Sentinel: absent -> False (leave alone), explicit null -> None (delete).
        numeric = validated_data.pop("numeric_spec", False)
        question = Question.objects.create(**validated_data)
        if options is not None:
            self._sync_options(question, options)
        if numeric is not False:
            self._sync_numeric(question, numeric)
        return question

    @transaction.atomic
    def update(self, instance, validated_data):
        options = validated_data.pop("options", None)
        numeric = validated_data.pop("numeric_spec", False)
        for key, value in validated_data.items():
            setattr(instance, key, value)
        instance.save()
        if options is not None:
            instance.options.all().delete()
            self._sync_options(instance, options)
        if numeric is not False:
            self._sync_numeric(instance, numeric)
        return instance


class ReviewDecisionSerializer(serializers.Serializer):
    comment = serializers.CharField(required=False, allow_blank=True, max_length=2000)


# --- Quizzes & attempts ---------------------------------------------------


class QuizSerializer(UUIDModelSerializer):
    class Meta:
        model = Quiz
        fields = [
            "id",
            "author",
            "kind",
            "title",
            "subject",
            "chapter",
            "topic",
            "config",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "author", "created_at", "updated_at"]


class QuizWriteSerializer(UUIDModelSerializer):
    class Meta:
        model = Quiz
        fields = [
            "id",
            "author",
            "kind",
            "title",
            "subject",
            "chapter",
            "topic",
            "config",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "author", "created_at", "updated_at"]

    def validate_config(self, value):
        return normalize_quiz_config(value)

    def validate(self, attrs):
        instance = self.instance
        chapter = attrs.get("chapter", getattr(instance, "chapter", None))
        topic = attrs.get("topic", getattr(instance, "topic", None))
        if chapter is not None and topic is not None and topic.chapter_id != chapter.id:
            raise serializers.ValidationError(
                {"topic": "The topic does not belong to the selected chapter."}
            )
        return attrs


class AttemptStartSerializer(serializers.Serializer):
    quiz = serializers.UUIDField()
    seed = serializers.IntegerField(required=False, allow_null=True)


class AnswerInputSerializer(serializers.Serializer):
    question = serializers.UUIDField()
    response = serializers.JSONField(required=False, allow_null=True)
    time_spent_s = serializers.IntegerField(required=False, allow_null=True, min_value=0)
    hint_used = serializers.BooleanField(required=False, default=False)


# --- Mastery & readiness (Phase A3) ------------------------------------------


class ReasonSerializer(serializers.Serializer):
    """A structured engine explanation (stable code + numeric params)."""

    code = serializers.CharField()
    params = serializers.DictField(required=False)


class TopicMasterySerializer(serializers.Serializer):
    """Read-only shape for one cached topic-mastery row."""

    topic = serializers.UUIDField()
    mastery = serializers.FloatField(allow_null=True)
    confidence = serializers.CharField()
    trend = serializers.CharField()
    effective_weight = serializers.FloatField()
    evidence_count = serializers.IntegerField()
    last_evidence_at = serializers.DateTimeField(allow_null=True)
    computed_at = serializers.DateTimeField()
    rules_version = serializers.IntegerField()
    reasons = ReasonSerializer(many=True)


class ReadinessSerializer(serializers.Serializer):
    """Read-only shape for a chapter/subject readiness aggregate."""

    value = serializers.FloatField(allow_null=True)
    band = serializers.CharField()
    coverage = serializers.FloatField()
    topics_with_evidence = serializers.IntegerField()
    topics_total = serializers.IntegerField()
    confidence = serializers.CharField()
    reasons = ReasonSerializer(many=True)


class SubjectReadinessSerializer(ReadinessSerializer):
    subject = serializers.CharField()


class MasteryRuleSetSerializer(UUIDModelSerializer):
    class Meta:
        model = MasteryRuleSet
        fields = [
            "id",
            "name",
            "version",
            "is_active",
            "json",
            "verified",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate_json(self, value):
        from .mastery_schema import MasteryRulesError, validate_mastery_rules

        try:
            validate_mastery_rules(value)
        except MasteryRulesError as exc:
            raise serializers.ValidationError(str(exc)) from exc
        return value


# --- Flashcards (Phase A4) ----------------------------------------------------


class FlashcardSerializer(UUIDModelSerializer):
    """Read shape for a flashcard (student-safe: no author/review fields)."""

    front_languages = serializers.SerializerMethodField()
    back_languages = serializers.SerializerMethodField()

    class Meta:
        model = Flashcard
        fields = [
            "id",
            "topic",
            "objective",
            "curriculum_version",
            "front_ar",
            "front_fr",
            "back_ar",
            "back_fr",
            "image",
            "difficulty",
            "status",
            "is_sample",
            "source_note",
            "created_at",
            "updated_at",
            "front_languages",
            "back_languages",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_front_languages(self, obj) -> list[str]:
        return obj.front_languages

    def get_back_languages(self, obj) -> list[str]:
        return obj.back_languages


class FlashcardTeacherSerializer(FlashcardSerializer):
    class Meta(FlashcardSerializer.Meta):
        fields = FlashcardSerializer.Meta.fields + [
            "author",
            "reviewer",
            "external_id",
            "review_comment",
            "reviewed_at",
        ]


class FlashcardWriteSerializer(UUIDModelSerializer):
    """Authoring serializer. Workflow/author fields are read-only."""

    class Meta:
        model = Flashcard
        fields = [
            "id",
            "topic",
            "objective",
            "curriculum_version",
            "front_ar",
            "front_fr",
            "back_ar",
            "back_fr",
            "image",
            "difficulty",
            "status",
            "author",
            "reviewer",
            "external_id",
            "review_comment",
            "reviewed_at",
            "is_sample",
            "source_note",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "status",
            "author",
            "reviewer",
            "review_comment",
            "reviewed_at",
            "created_at",
            "updated_at",
        ]

    def validate(self, attrs):
        instance = self.instance
        topic = attrs.get("topic", getattr(instance, "topic", None))
        objective = attrs.get("objective", getattr(instance, "objective", None))
        curriculum = attrs.get(
            "curriculum_version", getattr(instance, "curriculum_version", None)
        )
        errors: dict[str, str] = {}
        if topic is not None and curriculum is not None:
            if topic.chapter.curriculum_id != curriculum.id:
                errors["curriculum_version"] = (
                    "Must match the curriculum of the selected topic."
                )
        if objective is not None and topic is not None:
            if objective.topic_id != topic.id:
                errors["objective"] = "Must belong to the selected topic."
        if errors:
            raise serializers.ValidationError(errors)
        return attrs


class FlashcardStateSerializer(UUIDModelSerializer):
    class Meta:
        model = FlashcardState
        fields = ["id", "card", "box", "due_at", "last_reviewed_at", "streak", "lapses"]


class FlashcardReviewInputSerializer(serializers.Serializer):
    rating = serializers.ChoiceField(choices=FlashcardReview.Rating.choices)
    client_review_id = serializers.CharField(
        required=False, allow_null=True, allow_blank=True, max_length=128
    )
    response_ms = serializers.IntegerField(required=False, allow_null=True, min_value=0)
    reviewed_at = serializers.DateTimeField(required=False, allow_null=True)


class FlashcardRuleSetSerializer(UUIDModelSerializer):
    class Meta:
        model = FlashcardsRuleSet
        fields = [
            "id",
            "name",
            "version",
            "is_active",
            "json",
            "verified",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate_json(self, value):
        from .leitner_schema import LeitnerRulesError, validate_leitner_rules

        try:
            validate_leitner_rules(value)
        except LeitnerRulesError as exc:
            raise serializers.ValidationError(str(exc)) from exc
        return value


class TeacherGradeSerializer(UUIDModelSerializer):
    """Teacher-entered grade (calibration input)."""

    # Defaults to "now" server-side when omitted.
    recorded_at = serializers.DateTimeField(required=False)

    class Meta:
        model = TeacherGrade
        fields = [
            "id",
            "student",
            "subject",
            "score",
            "max_score",
            "recorded_by",
            "recorded_at",
            "source_note",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "recorded_by", "created_at", "updated_at"]

    def validate(self, attrs):
        score = attrs.get("score")
        max_score = attrs.get("max_score", 100.0)
        if score is not None and max_score and score > max_score:
            raise serializers.ValidationError(
                {"score": "Score cannot exceed max_score."}
            )
        return attrs
