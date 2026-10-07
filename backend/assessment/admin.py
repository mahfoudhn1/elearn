from django.contrib import admin

from .models import (
    AttemptAnswer,
    Evidence,
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
    QuizAttempt,
    TopicMastery,
)


class QuestionOptionInline(admin.TabularInline):
    model = QuestionOption
    extra = 0
    fields = ("order", "text_ar", "text_fr", "is_correct", "misconception")


class NumericAnswerSpecInline(admin.StackedInline):
    model = NumericAnswerSpec
    extra = 0
    max_num = 1
    fields = ("correct_value", "tolerance_abs", "tolerance_rel", "accepted_units")


@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    list_display = (
        "short_prompt",
        "kind",
        "status",
        "difficulty",
        "topic",
        "author",
        "is_sample",
        "updated_at",
    )
    list_filter = ("status", "kind", "difficulty", "is_sample", "curriculum_version")
    search_fields = ("prompt_ar", "prompt_fr", "explanation_ar", "explanation_fr", "external_id")
    raw_id_fields = ("topic", "objective", "curriculum_version", "author", "reviewer")
    date_hierarchy = "created_at"
    readonly_fields = ("reviewed_at", "created_at", "updated_at")
    inlines = [QuestionOptionInline, NumericAnswerSpecInline]
    list_select_related = ("topic", "author")

    @admin.display(description="Prompt")
    def short_prompt(self, obj):
        text = (obj.prompt_fr or obj.prompt_ar or "").strip()
        return (text[:50] + "...") if len(text) > 50 else text


@admin.register(Misconception)
class MisconceptionAdmin(admin.ModelAdmin):
    list_display = ("code", "topic", "description_fr", "description_ar")
    search_fields = ("code", "description_ar", "description_fr")
    list_filter = ("topic",)
    raw_id_fields = ("topic",)


@admin.register(NumericAnswerSpec)
class NumericAnswerSpecAdmin(admin.ModelAdmin):
    list_display = ("correct_value", "tolerance_abs", "tolerance_rel", "question")
    search_fields = ("question__external_id", "question__prompt_fr", "question__prompt_ar")
    raw_id_fields = ("question",)


@admin.register(Quiz)
class QuizAdmin(admin.ModelAdmin):
    list_display = ("title", "kind", "subject", "is_active", "author", "updated_at")
    list_filter = ("kind", "is_active")
    search_fields = ("title", "subject")
    raw_id_fields = ("author", "chapter", "topic")
    readonly_fields = ("created_at", "updated_at")


@admin.register(QuizAttempt)
class QuizAttemptAdmin(admin.ModelAdmin):
    list_display = ("student", "quiz", "status", "score", "started_at", "submitted_at")
    list_filter = ("status",)
    search_fields = ("student__user__username", "quiz__title")
    raw_id_fields = ("student", "quiz")
    date_hierarchy = "started_at"


@admin.register(AttemptAnswer)
class AttemptAnswerAdmin(admin.ModelAdmin):
    list_display = ("attempt", "question", "is_correct", "partial_score", "hint_used")
    list_filter = ("is_correct", "hint_used")
    search_fields = ("attempt__uuid", "question__external_id")
    raw_id_fields = ("attempt", "question", "misconception")


@admin.register(Evidence)
class EvidenceAdmin(admin.ModelAdmin):
    list_display = ("student", "topic", "source", "score", "difficulty", "occurred_at")
    list_filter = ("source", "difficulty")
    search_fields = ("student__user__username", "topic__title_ar", "topic__title_fr")
    raw_id_fields = ("student", "topic", "question")
    date_hierarchy = "occurred_at"


@admin.register(MasteryRuleSet)
class MasteryRuleSetAdmin(admin.ModelAdmin):
    list_display = ("name", "version", "is_active", "verified", "updated_at")
    list_filter = ("is_active", "verified")
    search_fields = ("name",)
    readonly_fields = ("created_at", "updated_at")


@admin.register(TopicMastery)
class TopicMasteryAdmin(admin.ModelAdmin):
    list_display = (
        "student",
        "topic",
        "mastery",
        "confidence",
        "trend",
        "effective_weight",
        "evidence_count",
        "computed_at",
    )
    list_filter = ("confidence", "trend")
    search_fields = ("student__user__username", "topic__title_ar", "topic__title_fr")
    raw_id_fields = ("student", "topic")
    readonly_fields = ("computed_at",)


@admin.register(FlashcardsRuleSet)
class FlashcardsRuleSetAdmin(admin.ModelAdmin):
    list_display = ("name", "version", "is_active", "verified", "updated_at")
    list_filter = ("is_active", "verified")
    search_fields = ("name",)
    readonly_fields = ("created_at", "updated_at")


@admin.register(Flashcard)
class FlashcardAdmin(admin.ModelAdmin):
    list_display = (
        "short_front",
        "status",
        "difficulty",
        "topic",
        "author",
        "is_sample",
        "updated_at",
    )
    list_filter = ("status", "difficulty", "is_sample", "curriculum_version")
    search_fields = ("front_ar", "front_fr", "back_ar", "back_fr", "external_id")
    raw_id_fields = ("topic", "objective", "curriculum_version", "author", "reviewer")
    date_hierarchy = "created_at"
    readonly_fields = ("reviewed_at", "created_at", "updated_at")
    list_select_related = ("topic", "author")

    @admin.display(description="Front")
    def short_front(self, obj):
        text = (obj.front_fr or obj.front_ar or "").strip()
        return (text[:50] + "...") if len(text) > 50 else text


@admin.register(FlashcardState)
class FlashcardStateAdmin(admin.ModelAdmin):
    list_display = ("student", "card", "box", "due_at", "streak", "lapses", "last_reviewed_at")
    list_filter = ("box",)
    search_fields = ("student__user__username", "card__front_fr", "card__front_ar")
    raw_id_fields = ("student", "card")
    date_hierarchy = "due_at"


@admin.register(FlashcardReview)
class FlashcardReviewAdmin(admin.ModelAdmin):
    list_display = ("student", "card", "rating", "reviewed_at", "response_ms")
    list_filter = ("rating",)
    search_fields = ("student__user__username", "card__front_fr", "card__front_ar", "client_review_id")
    raw_id_fields = ("student", "card")
    date_hierarchy = "reviewed_at"
