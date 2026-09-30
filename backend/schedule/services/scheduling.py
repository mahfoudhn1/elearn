from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, time, timedelta
from typing import Iterable

from django.db.models import Q, Sum
from django.utils import timezone

from groups.models import Schedule
from ..models import PersonalScheduleItem


@dataclass
class BusyInterval:
    start: datetime
    end: datetime
    source: str
    source_id: int
    title: str


class SchedulingService:
    def __init__(self, user):
        self.user = user

    def _student(self):
        return getattr(self.user, "student", None)

    def get_personal_items_queryset(self, start: datetime | None = None, end: datetime | None = None):
        # Terminal items no longer occupy time, so a finished or cancelled task
        # (or a missed exam) must not block a new booking that overlaps it.
        qs = PersonalScheduleItem.objects.filter(user=self.user).exclude(
            status__in=[
                PersonalScheduleItem.Status.COMPLETED,
                PersonalScheduleItem.Status.CANCELLED,
                PersonalScheduleItem.Status.MISSED,
            ]
        )
        if start and end:
            qs = qs.filter(start_datetime__lt=end, end_datetime__gt=start)
        return qs

    def get_group_schedules_queryset(self):
        student = self._student()
        if not student:
            return Schedule.objects.none()
        return Schedule.objects.filter(group__students=student).select_related("group")

    def _group_interval_for_date(self, schedule: Schedule, target_date: date):
        if schedule.start_time is None or schedule.end_time is None:
            return None
        if schedule.schedule_type == "custom":
            if schedule.scheduled_date != target_date:
                return None
        else:
            if schedule.day_of_week.lower() != target_date.strftime("%A").lower():
                return None
        start_dt = timezone.make_aware(datetime.combine(target_date, schedule.start_time))
        end_dt = timezone.make_aware(datetime.combine(target_date, schedule.end_time))
        return start_dt, end_dt

    def get_group_busy_intervals(self, start: datetime, end: datetime) -> list[BusyInterval]:
        intervals: list[BusyInterval] = []
        schedules = self.get_group_schedules_queryset()
        current_date = start.date()
        while current_date <= end.date():
            for schedule in schedules:
                interval = self._group_interval_for_date(schedule, current_date)
                if not interval:
                    continue
                start_dt, end_dt = interval
                if start_dt < end and end_dt > start:
                    intervals.append(
                        BusyInterval(
                            start=start_dt,
                            end=end_dt,
                            source="group_schedule",
                            source_id=schedule.id,
                            title=f"{schedule.group.name} class",
                        )
                    )
            current_date += timedelta(days=1)
        return intervals

    def get_personal_busy_intervals(self, start: datetime, end: datetime, exclude_id: int | None = None) -> list[BusyInterval]:
        qs = self.get_personal_items_queryset(start, end)
        if exclude_id:
            qs = qs.exclude(id=exclude_id)
        intervals = []
        for item in qs:
            intervals.append(
                BusyInterval(
                    start=item.start_datetime,
                    end=item.end_datetime,
                    source="personal_schedule",
                    source_id=item.id,
                    title=item.title,
                )
            )
        return intervals

    def get_busy_intervals(self, start: datetime, end: datetime, exclude_personal_item_id: int | None = None) -> list[BusyInterval]:
        intervals = self.get_personal_busy_intervals(start, end, exclude_personal_item_id)
        intervals.extend(self.get_group_busy_intervals(start, end))
        return sorted(intervals, key=lambda item: item.start)

    def check_conflict(self, start: datetime, end: datetime, exclude_personal_item_id: int | None = None):
        return self.get_busy_intervals(start, end, exclude_personal_item_id)

    def get_available_slots(
        self,
        start: datetime,
        end: datetime,
        work_start: time,
        work_end: time,
        min_duration_minutes: int = 30,
    ):
        busy = self.get_busy_intervals(start, end)
        slots = []
        day_cursor = start.date()
        while day_cursor <= end.date():
            day_start = timezone.make_aware(datetime.combine(day_cursor, work_start))
            day_end = timezone.make_aware(datetime.combine(day_cursor, work_end))
            if day_end <= day_start:
                day_cursor += timedelta(days=1)
                continue
            day_busy = [b for b in busy if b.start < day_end and b.end > day_start]
            day_busy.sort(key=lambda b: b.start)
            pointer = day_start
            for interval in day_busy:
                if interval.start > pointer:
                    candidate_end = min(interval.start, day_end)
                    if (candidate_end - pointer).total_seconds() >= min_duration_minutes * 60:
                        slots.append({"start": pointer, "end": candidate_end})
                pointer = max(pointer, interval.end)
                if pointer >= day_end:
                    break
            if pointer < day_end and (day_end - pointer).total_seconds() >= min_duration_minutes * 60:
                slots.append({"start": pointer, "end": day_end})
            day_cursor += timedelta(days=1)
        return slots

    def get_suggested_slots(self, target_date: date, duration_minutes: int, preferred_start: time | None = None, preferred_end: time | None = None):
        work_start = preferred_start or time(8, 0)
        work_end = preferred_end or time(20, 0)
        start = timezone.make_aware(datetime.combine(target_date, time.min))
        end = timezone.make_aware(datetime.combine(target_date, time.max))
        available = self.get_available_slots(start, end, work_start, work_end, duration_minutes)
        suggestions = []
        for slot in available:
            slot_minutes = int((slot["end"] - slot["start"]).total_seconds() // 60)
            if slot_minutes >= duration_minutes:
                suggestions.append(
                    {
                        "start": slot["start"],
                        "end": slot["start"] + timedelta(minutes=duration_minutes),
                        "available_window_end": slot["end"],
                    }
                )
        return suggestions

    def get_schedule_statistics(self, start: datetime, end: datetime):
        base_qs = PersonalScheduleItem.objects.filter(user=self.user, start_datetime__lt=end, end_datetime__gt=start)
        tasks = base_qs.filter(item_type=PersonalScheduleItem.ItemType.TASK)
        exams = base_qs.filter(item_type=PersonalScheduleItem.ItemType.EXAM)

        total_tasks = tasks.count()
        completed_tasks = tasks.filter(status=PersonalScheduleItem.Status.COMPLETED).count()
        overdue_tasks = tasks.exclude(status__in=[PersonalScheduleItem.Status.COMPLETED, PersonalScheduleItem.Status.CANCELLED]).filter(end_datetime__lt=timezone.now()).count()

        est_minutes = tasks.aggregate(total=Sum("estimated_duration_minutes"))["total"] or 0
        actual_minutes = tasks.aggregate(total=Sum("actual_duration_minutes"))["total"] or 0

        completion_rate = round((completed_tasks / total_tasks) * 100, 2) if total_tasks else 0

        upcoming_exams = exams.filter(status=PersonalScheduleItem.Status.UPCOMING, start_datetime__gte=timezone.now()).count()
        missed_exams = exams.filter(status=PersonalScheduleItem.Status.MISSED).count()

        return {
            "total_scheduled_tasks": total_tasks,
            "completed_tasks": completed_tasks,
            "incomplete_tasks": total_tasks - completed_tasks,
            "overdue_tasks": overdue_tasks,
            "completion_percentage": completion_rate,
            "total_estimated_study_minutes": est_minutes,
            "total_completed_study_minutes": actual_minutes,
            "upcoming_exams": upcoming_exams,
            "missed_exams": missed_exams,
        }
