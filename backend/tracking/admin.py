from django.contrib import admin

from .models import (
    ActivityEvent,
    DailyActivity,
    Goal,
    GoalPeriodResult,
    StudyGoal,
    UserTrackingSettings,
)


@admin.register(UserTrackingSettings)
class UserTrackingSettingsAdmin(admin.ModelAdmin):
    list_display = ("user", "timezone", "updated_at")
    search_fields = ("user__username", "user__email")
    raw_id_fields = ("user",)


@admin.register(ActivityEvent)
class ActivityEventAdmin(admin.ModelAdmin):
    list_display = ("user", "event_type", "duration_seconds", "occurred_at")
    list_filter = ("event_type",)
    search_fields = ("user__username", "user__email")
    date_hierarchy = "occurred_at"
    raw_id_fields = ("user",)


@admin.register(DailyActivity)
class DailyActivityAdmin(admin.ModelAdmin):
    list_display = (
        "user",
        "date",
        "event_count",
        "lesson_count",
        "quiz_count",
        "watch_minutes",
    )
    list_filter = ("date",)
    search_fields = ("user__username", "user__email")
    date_hierarchy = "date"
    raw_id_fields = ("user",)


@admin.register(StudyGoal)
class StudyGoalAdmin(admin.ModelAdmin):
    list_display = (
        "user",
        "metric",
        "period",
        "target",
        "course",
        "is_active",
        "effective_from",
    )
    list_filter = ("metric", "period", "is_active")
    search_fields = ("user__username", "user__email")
    raw_id_fields = ("user", "course")
    date_hierarchy = "created_at"


@admin.register(GoalPeriodResult)
class GoalPeriodResultAdmin(admin.ModelAdmin):
    list_display = (
        "goal",
        "period_start",
        "period_end",
        "target",
        "achieved",
        "met",
    )
    list_filter = ("met", "period_start")
    search_fields = ("goal__user__username", "goal__user__email")
    date_hierarchy = "period_start"
    raw_id_fields = ("goal",)


@admin.register(Goal)
class GoalAdmin(admin.ModelAdmin):
    list_display = ("user", "metric", "period", "target", "is_active", "effective_from")
    list_filter = ("metric", "period", "is_active")
    search_fields = ("user__username", "user__email")
    raw_id_fields = ("user",)
