from django.contrib import admin

from .models import (
    DailyProductivity,
    PersonalScheduleItem,
    PomodoroInterval,
    PomodoroSettings,
    StudySession,
)


@admin.register(PersonalScheduleItem)
class PersonalScheduleItemAdmin(admin.ModelAdmin):
    list_display = ("title", "user", "item_type", "status", "priority", "start_datetime")
    list_filter = ("item_type", "status", "priority")
    search_fields = ("title", "subject", "user__username")
    date_hierarchy = "start_datetime"
    raw_id_fields = ("user", "group")


@admin.register(PomodoroSettings)
class PomodoroSettingsAdmin(admin.ModelAdmin):
    list_display = (
        "user",
        "focus_minutes",
        "short_break_minutes",
        "long_break_minutes",
        "daily_goal_minutes",
        "timezone_offset_minutes",
    )
    search_fields = ("user__username",)
    raw_id_fields = ("user",)


class PomodoroIntervalInline(admin.TabularInline):
    model = PomodoroInterval
    extra = 0
    fields = ("sequence", "kind", "status", "planned_seconds", "accumulated_seconds", "started_at", "ended_at", "interruptions")
    readonly_fields = fields
    ordering = ("sequence",)
    can_delete = False


@admin.register(StudySession)
class StudySessionAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "user",
        "local_date",
        "subject",
        "status",
        "completed_pomodoros",
        "total_focus_seconds",
        "focus_score",
    )
    list_filter = ("status", "local_date")
    search_fields = ("subject", "user__username")
    date_hierarchy = "started_at"
    raw_id_fields = ("user", "schedule_item", "group")
    inlines = [PomodoroIntervalInline]


@admin.register(PomodoroInterval)
class PomodoroIntervalAdmin(admin.ModelAdmin):
    list_display = ("id", "session", "sequence", "kind", "status", "planned_seconds", "accumulated_seconds")
    list_filter = ("kind", "status")
    raw_id_fields = ("session",)


@admin.register(DailyProductivity)
class DailyProductivityAdmin(admin.ModelAdmin):
    list_display = (
        "user",
        "date",
        "focus_minutes",
        "completed_pomodoros",
        "sessions_count",
        "tasks_completed",
        "goal_minutes",
        "goal_met",
        "avg_focus_score",
    )
    list_filter = ("goal_met", "date")
    search_fields = ("user__username",)
    date_hierarchy = "date"
    raw_id_fields = ("user",)
