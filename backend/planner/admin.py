from django.contrib import admin

from .models import (
    AcademicPeriod,
    AcademicYear,
    Chapter,
    Commitment,
    CommitmentException,
    CurriculumVersion,
    LearningObjective,
    PedagogyRuleSet,
    PlannedSession,
    PlannerExam,
    SessionTombstone,
    StudentPlannerProfile,
    StudentTopicProgress,
    StudyPlan,
    SubjectConfig,
    SubjectImportance,
    SubjectPlanningMode,
    SubjectConfidence,
    Topic,
)


class AcademicPeriodInline(admin.TabularInline):
    model = AcademicPeriod
    extra = 0
    fields = ("kind", "label", "start_date", "end_date", "suspends_school", "verified")


@admin.register(AcademicYear)
class AcademicYearAdmin(admin.ModelAdmin):
    list_display = ("label", "start_date", "end_date", "is_current")
    list_filter = ("is_current",)
    search_fields = ("label",)
    date_hierarchy = "start_date"
    inlines = [AcademicPeriodInline]


@admin.register(AcademicPeriod)
class AcademicPeriodAdmin(admin.ModelAdmin):
    list_display = ("academic_year", "kind", "label", "start_date", "end_date", "verified")
    list_filter = ("kind", "verified", "suspends_school")
    search_fields = ("label", "academic_year__label")
    date_hierarchy = "start_date"
    raw_id_fields = ("academic_year",)


@admin.register(StudentPlannerProfile)
class StudentPlannerProfileAdmin(admin.ModelAdmin):
    list_display = ("student", "timezone", "preferred_period", "week_start", "onboarding_completed")
    list_filter = ("preferred_period", "session_length_preference", "week_start", "onboarding_completed")
    search_fields = ("student__user__username", "student__user__email")
    raw_id_fields = ("student",)


class CommitmentExceptionInline(admin.TabularInline):
    model = CommitmentException
    extra = 0
    fields = ("date", "type", "new_start", "new_end", "reason")


@admin.register(Commitment)
class CommitmentAdmin(admin.ModelAdmin):
    list_display = ("title", "student", "kind", "origin", "weekday", "start_time", "end_time", "valid_from", "valid_to")
    list_filter = ("kind", "origin", "weekday", "suspended_by_periods")
    search_fields = ("title", "subject", "student__user__username")
    raw_id_fields = ("student",)
    inlines = [CommitmentExceptionInline]


@admin.register(CommitmentException)
class CommitmentExceptionAdmin(admin.ModelAdmin):
    list_display = ("commitment", "date", "type", "new_start", "new_end")
    list_filter = ("type",)
    search_fields = ("commitment__title", "commitment__student__user__username")
    raw_id_fields = ("commitment",)
    date_hierarchy = "date"


@admin.register(SubjectConfidence)
class SubjectConfidenceAdmin(admin.ModelAdmin):
    list_display = ("student", "subject", "level")
    list_filter = ("level", "subject")
    search_fields = ("student__user__username", "subject")
    raw_id_fields = ("student",)


@admin.register(PlannerExam)
class PlannerExamAdmin(admin.ModelAdmin):
    list_display = ("student", "subject", "exam_date", "exam_type")
    list_filter = ("exam_type", "exam_date")
    search_fields = ("student__user__username", "subject")
    raw_id_fields = ("student",)
    date_hierarchy = "exam_date"


@admin.register(PedagogyRuleSet)
class PedagogyRuleSetAdmin(admin.ModelAdmin):
    list_display = ("name", "version", "is_active", "applies_to_level", "applies_to_stream", "verified")
    list_filter = ("is_active", "verified")
    search_fields = ("name", "applies_to_level", "applies_to_stream")


@admin.register(SubjectConfig)
class SubjectConfigAdmin(admin.ModelAdmin):
    list_display = ("subject", "level", "stream", "coefficient", "weekly_target_minutes", "verified")
    list_filter = ("verified", "level", "stream")
    search_fields = ("subject", "level", "stream")


@admin.register(SubjectImportance)
class SubjectImportanceAdmin(admin.ModelAdmin):
    list_display = ("subject", "level", "stream", "coefficient", "tier", "verified", "academic_year")
    list_filter = ("tier", "verified", "level", "stream")
    search_fields = ("subject", "level", "stream")


@admin.register(SubjectPlanningMode)
class SubjectPlanningModeAdmin(admin.ModelAdmin):
    list_display = ("student", "subject", "mode", "updated_at")
    list_filter = ("mode",)
    search_fields = ("student__user__username", "subject")


class PlannedSessionInline(admin.TabularInline):
    model = PlannedSession
    extra = 0
    fields = ("subject", "activity_type", "start_dt", "end_dt", "origin", "state", "is_locked")


@admin.register(StudyPlan)
class StudyPlanAdmin(admin.ModelAdmin):
    list_display = ("student", "version", "window_start", "window_end", "trigger", "created_at")
    list_filter = ("trigger",)
    search_fields = ("student__user__username",)
    raw_id_fields = ("student", "rule_set")
    inlines = [PlannedSessionInline]


@admin.register(PlannedSession)
class PlannedSessionAdmin(admin.ModelAdmin):
    list_display = ("student", "subject", "activity_type", "start_dt", "end_dt", "origin", "state", "is_locked")
    list_filter = ("origin", "state", "is_locked", "activity_type")
    search_fields = ("student__user__username", "subject")
    raw_id_fields = ("student", "plan", "personal_item", "replaced_by")
    date_hierarchy = "start_dt"


@admin.register(SessionTombstone)
class SessionTombstoneAdmin(admin.ModelAdmin):
    list_display = ("student", "date", "start_min", "end_min", "subject", "activity_type")
    search_fields = ("student__user__username", "subject")
    raw_id_fields = ("student", "source_session")
    date_hierarchy = "date"


class ChapterInline(admin.TabularInline):
    model = Chapter
    extra = 0
    fields = ("subject", "order", "title_ar", "title_fr", "weight")


@admin.register(CurriculumVersion)
class CurriculumVersionAdmin(admin.ModelAdmin):
    list_display = ("academic_year", "level", "stream", "status", "verified")
    list_filter = ("status", "verified", "level", "stream")
    search_fields = ("level", "stream", "source_note", "academic_year__label")
    raw_id_fields = ("academic_year",)
    inlines = [ChapterInline]


class TopicInline(admin.TabularInline):
    model = Topic
    extra = 0
    fields = ("order", "title_ar", "title_fr")


@admin.register(Chapter)
class ChapterAdmin(admin.ModelAdmin):
    list_display = ("curriculum", "subject", "order", "title_fr", "title_ar", "weight")
    list_filter = ("subject",)
    search_fields = ("title_ar", "title_fr", "subject")
    raw_id_fields = ("curriculum",)
    inlines = [TopicInline]


class LearningObjectiveInline(admin.TabularInline):
    model = LearningObjective
    extra = 0
    fields = ("order", "text_ar", "text_fr")


@admin.register(Topic)
class TopicAdmin(admin.ModelAdmin):
    list_display = ("chapter", "order", "title_fr", "title_ar")
    search_fields = ("title_ar", "title_fr")
    raw_id_fields = ("chapter",)
    inlines = [LearningObjectiveInline]


@admin.register(StudentTopicProgress)
class StudentTopicProgressAdmin(admin.ModelAdmin):
    list_display = ("student", "topic", "status", "last_studied_at")
    list_filter = ("status",)
    search_fields = ("student__user__username", "topic__title_ar", "topic__title_fr")
    raw_id_fields = ("student", "topic")
