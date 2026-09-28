from django.utils import timezone
from rest_framework import serializers
from core.serializers import UUIDModelSerializer, UUIDRelatedField

from groups.models import Group

from .models import (
    DailyProductivity,
    PersonalScheduleItem,
    PomodoroInterval,
    PomodoroSettings,
    StudySession,
)
from .services import SchedulingService


class PersonalScheduleItemSerializer(UUIDModelSerializer):
    class Meta:
        model = PersonalScheduleItem
        fields = [
            "id",
            "user",
            "title",
            "description",
            "item_type",
            "status",
            "priority",
            "start_datetime",
            "end_datetime",
            "subject",
            "group",
            "location",
            "meeting_info",
            "notes",
            "progress_percentage",
            "estimated_duration_minutes",
            "target_prep_minutes",
            "actual_duration_minutes",
            "actual_start_time",
            "completed_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "user"]

    def validate(self, attrs):
        request = self.context["request"]
        user = request.user

        start_dt = attrs.get("start_datetime", getattr(self.instance, "start_datetime", None))
        end_dt = attrs.get("end_datetime", getattr(self.instance, "end_datetime", None))
        item_type = attrs.get("item_type", getattr(self.instance, "item_type", None))
        status_value = attrs.get("status", getattr(self.instance, "status", None))
        progress = attrs.get("progress_percentage", getattr(self.instance, "progress_percentage", 0))

        if not start_dt or not end_dt:
            raise serializers.ValidationError("start_datetime and end_datetime are required.")

        if end_dt <= start_dt:
            raise serializers.ValidationError("end_datetime must be strictly after start_datetime.")

        if timezone.is_naive(start_dt) or timezone.is_naive(end_dt):
            raise serializers.ValidationError("Datetimes must be timezone-aware.")

        task_statuses = {
            PersonalScheduleItem.Status.TODO,
            PersonalScheduleItem.Status.IN_PROGRESS,
            PersonalScheduleItem.Status.COMPLETED,
            PersonalScheduleItem.Status.CANCELLED,
        }
        exam_statuses = {
            PersonalScheduleItem.Status.UPCOMING,
            PersonalScheduleItem.Status.COMPLETED,
            PersonalScheduleItem.Status.MISSED,
            PersonalScheduleItem.Status.CANCELLED,
        }

        if item_type == PersonalScheduleItem.ItemType.TASK and status_value not in task_statuses:
            raise serializers.ValidationError("Invalid task status.")
        if item_type == PersonalScheduleItem.ItemType.EXAM and status_value not in exam_statuses:
            raise serializers.ValidationError("Invalid exam status.")

        if progress < 0 or progress > 100:
            raise serializers.ValidationError("progress_percentage must be between 0 and 100.")

        if status_value == PersonalScheduleItem.Status.COMPLETED and not attrs.get("completed_at") and not getattr(self.instance, "completed_at", None):
            attrs["completed_at"] = timezone.now()

        exclude_id = self.instance.id if self.instance else None
        conflicts = SchedulingService(user).check_conflict(start_dt, end_dt, exclude_personal_item_id=exclude_id)
        if conflicts:
            first_conflict = conflicts[0]
            if first_conflict.source == "group_schedule":
                raise serializers.ValidationError(
                    {
                        "non_field_errors": [
                            f"Conflicts with group session '{first_conflict.title}' between {first_conflict.start} and {first_conflict.end}."
                        ]
                    }
                )
            raise serializers.ValidationError(
                {
                    "non_field_errors": [
                        f"Conflicts with personal schedule item '{first_conflict.title}' between {first_conflict.start} and {first_conflict.end}."
                    ]
                }
            )

        return attrs


class PomodoroSettingsSerializer(UUIDModelSerializer):
    # Bounds are declared per-field so the client gets an error naming the field
    # it got wrong, rather than one lumped non_field_errors string.
    focus_minutes = serializers.IntegerField(min_value=1, max_value=180, required=False)
    short_break_minutes = serializers.IntegerField(min_value=1, max_value=60, required=False)
    long_break_minutes = serializers.IntegerField(min_value=1, max_value=120, required=False)
    pomodoros_until_long_break = serializers.IntegerField(min_value=1, max_value=12, required=False)
    daily_goal_minutes = serializers.IntegerField(min_value=0, max_value=1440, required=False)
    # UTC-14:00 through UTC+14:00, the real span of world offsets.
    timezone_offset_minutes = serializers.IntegerField(min_value=-840, max_value=840, required=False)

    class Meta:
        model = PomodoroSettings
        fields = [
            "focus_minutes",
            "short_break_minutes",
            "long_break_minutes",
            "pomodoros_until_long_break",
            "auto_start_breaks",
            "auto_start_focus",
            "daily_goal_minutes",
            "timezone_offset_minutes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]


class PomodoroIntervalSerializer(UUIDModelSerializer):
    """Read-only view of one timer phase.

    ``elapsed_seconds`` and ``remaining_seconds`` are computed server-side on every
    read, which is what lets a client reconnect mid-pomodoro and land on the right
    number instead of restarting the countdown.
    """

    elapsed_seconds = serializers.IntegerField(read_only=True)
    remaining_seconds = serializers.IntegerField(read_only=True)
    is_elapsed = serializers.BooleanField(read_only=True)

    class Meta:
        model = PomodoroInterval
        fields = [
            "id",
            "kind",
            "status",
            "sequence",
            "planned_seconds",
            "accumulated_seconds",
            "elapsed_seconds",
            "remaining_seconds",
            "is_elapsed",
            "started_at",
            "last_resumed_at",
            "ended_at",
            "interruptions",
        ]
        # Declared fields above are already read_only; listing only model fields
        # here keeps the two mechanisms from overlapping.
        read_only_fields = [
            "id",
            "kind",
            "status",
            "sequence",
            "planned_seconds",
            "accumulated_seconds",
            "started_at",
            "last_resumed_at",
            "ended_at",
            "interruptions",
        ]


#: Every StudySession model field the API exposes. All read-only: a session
#: changes through the timer actions, never through a PATCH.
SESSION_MODEL_FIELDS = [
    "id",
    "status",
    "subject",
    "schedule_item",
    "group",
    "started_at",
    "ended_at",
    "local_date",
    "planned_pomodoros",
    "completed_pomodoros",
    "total_focus_seconds",
    "total_break_seconds",
    "interruptions",
    "focus_score",
    "notes",
]


class StudySessionListSerializer(UUIDModelSerializer):
    """History rows -- no nested intervals, which would bloat a long list."""

    total_focus_minutes = serializers.IntegerField(read_only=True)
    schedule_item_title = serializers.CharField(
        source="schedule_item.title", read_only=True, default=None
    )

    class Meta:
        model = StudySession
        fields = SESSION_MODEL_FIELDS + ["schedule_item_title", "total_focus_minutes"]
        # Declared fields carry their own read_only=True, so only model fields
        # are listed here -- the two mechanisms should not overlap.
        read_only_fields = SESSION_MODEL_FIELDS


class StudySessionSerializer(StudySessionListSerializer):
    """Full session, including the live timer state the client renders from."""

    intervals = PomodoroIntervalSerializer(many=True, read_only=True)
    current_interval = PomodoroIntervalSerializer(read_only=True)

    class Meta(StudySessionListSerializer.Meta):
        fields = StudySessionListSerializer.Meta.fields + ["current_interval", "intervals"]


class StudySessionStartSerializer(serializers.Serializer):
    """Input for starting a session. Relations are scoped to the caller."""

    subject = serializers.CharField(
        max_length=150, required=False, allow_blank=True, allow_null=True
    )
    schedule_item = UUIDRelatedField(
        queryset=PersonalScheduleItem.objects.none(), required=False, allow_null=True
    )
    group = UUIDRelatedField(
        queryset=Group.objects.none(), required=False, allow_null=True
    )
    planned_pomodoros = serializers.IntegerField(
        min_value=1, max_value=24, required=False, allow_null=True
    )
    notes = serializers.CharField(required=False, allow_blank=True, allow_null=True)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        if request is None or not request.user.is_authenticated:
            return
        user = request.user
        self.fields["schedule_item"].queryset = PersonalScheduleItem.objects.filter(user=user)
        self.fields["group"].queryset = self._group_queryset(user)

    @staticmethod
    def _group_queryset(user):
        """Groups the caller actually belongs to -- the field is a label for
        analytics, but it should not become a way to probe for group ids."""
        student = getattr(user, "student", None)
        if student is not None:
            return Group.objects.filter(students=student)
        teacher = getattr(user, "teacher", None)
        if teacher is not None:
            return Group.objects.filter(admin=teacher)
        return Group.objects.none()


class DailyProductivitySerializer(UUIDModelSerializer):
    class Meta:
        model = DailyProductivity
        fields = [
            "date",
            "focus_minutes",
            "break_minutes",
            "completed_pomodoros",
            "sessions_count",
            "interruptions",
            "tasks_completed",
            "goal_minutes",
            "goal_met",
            "avg_focus_score",
            "updated_at",
        ]
        read_only_fields = fields
