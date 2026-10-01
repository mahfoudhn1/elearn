from datetime import date, datetime, timedelta, time

from django.db import transaction
from django.utils import timezone
from rest_framework import generics, mixins, serializers as drf_serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from core.views import UUIDLookupMixin
from core.views import UUIDLookupMixin

from .models import PersonalScheduleItem, PomodoroSettings, StudySession
from .serializers import (
    PersonalScheduleItemSerializer,
    PomodoroSettingsSerializer,
    StudySessionListSerializer,
    StudySessionSerializer,
    StudySessionStartSerializer,
)
from .services import PomodoroError, PomodoroService, ProductivityService, SchedulingService
from .services.localtime import local_day_bounds, local_today

#: Upper bound on an analytics window. ``daily()`` zero-fills every day in the
#: range, so an unbounded span would happily try to build a decade of rows.
MAX_WINDOW_DAYS = 366


def _parse_local_date(value, field_name):
    try:
        return date.fromisoformat(value)
    except (TypeError, ValueError):
        raise drf_serializers.ValidationError({field_name: "Expected a date as YYYY-MM-DD."})


def _analytics_window(request, service):
    """Resolve ``?start=&end=`` as local dates, defaulting to the last 30 days."""
    default_start, default_end = service.default_window()

    start_param = request.query_params.get("start")
    end_param = request.query_params.get("end")
    start = _parse_local_date(start_param, "start") if start_param else default_start
    end = _parse_local_date(end_param, "end") if end_param else default_end

    if end < start:
        raise drf_serializers.ValidationError({"end": "end must not be before start."})
    if (end - start).days + 1 > MAX_WINDOW_DAYS:
        raise drf_serializers.ValidationError(
            {"end": f"Window must not exceed {MAX_WINDOW_DAYS} days."}
        )
    return start, end



class PersonalScheduleItemViewSet(UUIDLookupMixin, viewsets.ModelViewSet):
    serializer_class = PersonalScheduleItemSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = PersonalScheduleItem.objects.filter(user=self.request.user).select_related("group")
        start = self.request.query_params.get("start")
        end = self.request.query_params.get("end")
        item_type = self.request.query_params.get("type")
        status_value = self.request.query_params.get("status")
        subject = self.request.query_params.get("subject")
        group_id = self.request.query_params.get("group")

        if start:
            qs = qs.filter(start_datetime__gte=start)
        if end:
            qs = qs.filter(end_datetime__lte=end)
        if item_type:
            qs = qs.filter(item_type=item_type)
        if status_value:
            qs = qs.filter(status=status_value)
        if subject:
            qs = qs.filter(subject__iexact=subject)
        if group_id:
            qs = qs.filter(group__uuid=group_id)
        return qs

    def perform_create(self, serializer):
        with transaction.atomic():
            serializer.save(user=self.request.user)

    def perform_update(self, serializer):
        with transaction.atomic():
            serializer.save()

    @action(detail=False, methods=["get"])
    def today(self, request):
        # "Today" is the student's local day, not the server's UTC day.
        preferences, _ = PomodoroSettings.objects.get_or_create(user=request.user)
        offset = preferences.timezone_offset_minutes
        start, end = local_day_bounds(local_today(offset, timezone.now()), offset)
        items = self.get_queryset().filter(start_datetime__lt=end, end_datetime__gt=start)
        return Response(self.get_serializer(items, many=True).data)

    @action(detail=False, methods=["get"], url_path="exams/upcoming")
    def upcoming_exams(self, request):
        qs = self.get_queryset().filter(
            item_type=PersonalScheduleItem.ItemType.EXAM,
            status=PersonalScheduleItem.Status.UPCOMING,
            start_datetime__gte=timezone.now(),
        )
        return Response(self.get_serializer(qs, many=True).data)

    @action(detail=False, methods=["get"], url_path="tasks/overdue")
    def overdue_tasks(self, request):
        qs = self.get_queryset().filter(item_type=PersonalScheduleItem.ItemType.TASK).exclude(
            status__in=[PersonalScheduleItem.Status.COMPLETED, PersonalScheduleItem.Status.CANCELLED]
        ).filter(end_datetime__lt=timezone.now())
        return Response(self.get_serializer(qs, many=True).data)

    @action(detail=False, methods=["get"])
    def availability(self, request):
        date_from = request.query_params.get("start")
        date_to = request.query_params.get("end")
        if not date_from or not date_to:
            return Response({"detail": "start and end are required (ISO datetime)."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            start = datetime.fromisoformat(date_from)
            end = datetime.fromisoformat(date_to)
            if timezone.is_naive(start):
                start = timezone.make_aware(start)
            if timezone.is_naive(end):
                end = timezone.make_aware(end)
        except ValueError:
            return Response({"detail": "Invalid datetime format."}, status=status.HTTP_400_BAD_REQUEST)

        work_start_str = request.query_params.get("work_start", "08:00")
        work_end_str = request.query_params.get("work_end", "20:00")
        min_duration = int(request.query_params.get("min_duration_minutes", "30"))

        work_start = time.fromisoformat(work_start_str)
        work_end = time.fromisoformat(work_end_str)

        service = SchedulingService(request.user)
        slots = service.get_available_slots(start, end, work_start, work_end, min_duration)
        return Response(
            [{"start": s["start"].isoformat(), "end": s["end"].isoformat()} for s in slots]
        )

    @action(detail=False, methods=["post"], url_path="suggest")
    def suggest_slots(self, request):
        date_str = request.data.get("date")
        duration = request.data.get("duration_minutes")
        if not date_str or not duration:
            return Response({"detail": "date and duration_minutes are required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            target_date = datetime.fromisoformat(date_str).date()
            duration = int(duration)
        except (ValueError, TypeError):
            return Response({"detail": "Invalid date or duration_minutes."}, status=status.HTTP_400_BAD_REQUEST)

        pref_start = request.data.get("preferred_start")
        pref_end = request.data.get("preferred_end")
        preferred_start = time.fromisoformat(pref_start) if pref_start else None
        preferred_end = time.fromisoformat(pref_end) if pref_end else None

        service = SchedulingService(request.user)
        suggestions = service.get_suggested_slots(target_date, duration, preferred_start, preferred_end)
        return Response(
            [
                {
                    "start": item["start"].isoformat(),
                    "end": item["end"].isoformat(),
                    "available_window_end": item["available_window_end"].isoformat(),
                }
                for item in suggestions
            ]
        )

    @action(detail=False, methods=["get"])
    def statistics(self, request):
        start_q = request.query_params.get("start")
        end_q = request.query_params.get("end")
        if not start_q or not end_q:
            return Response({"detail": "start and end are required (ISO datetime)."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            start = datetime.fromisoformat(start_q)
            end = datetime.fromisoformat(end_q)
            if timezone.is_naive(start):
                start = timezone.make_aware(start)
            if timezone.is_naive(end):
                end = timezone.make_aware(end)
        except ValueError:
            return Response({"detail": "Invalid datetime format."}, status=status.HTTP_400_BAD_REQUEST)

        service = SchedulingService(request.user)
        return Response(service.get_schedule_statistics(start, end))


class PomodoroSettingsView(generics.RetrieveUpdateAPIView):
    """The caller's own pomodoro preferences -- a singleton, so no pk in the URL."""

    serializer_class = PomodoroSettingsSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        obj, _ = PomodoroSettings.objects.get_or_create(user=self.request.user)
        return obj

    def perform_update(self, serializer):
        instance = serializer.instance
        previous = (instance.timezone_offset_minutes, instance.daily_goal_minutes)
        preferences = serializer.save()

        # Both of these change what past rollups mean: the offset moves which
        # local day a session belongs to, and the goal decides goal_met. Rebuild
        # the reporting window so the dashboard does not go stale behind them.
        if (preferences.timezone_offset_minutes, preferences.daily_goal_minutes) != previous:
            service = ProductivityService(self.request.user, preferences=preferences)
            service.recompute_range(*service.default_window())


class StudySessionViewSet(
    UUIDLookupMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    """The pomodoro timer.

    Sessions are created and advanced through explicit actions rather than
    PUT/PATCH -- the server owns the clock, so there is no writable state for a
    client to set.
    """

    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = StudySession.objects.filter(user=self.request.user).select_related(
            "schedule_item", "group"
        )
        if self.action != "list":
            qs = qs.prefetch_related("intervals")

        params = self.request.query_params
        start = params.get("start")
        end = params.get("end")
        subject = params.get("subject")
        status_value = params.get("status")
        schedule_item = params.get("schedule_item")

        if start:
            qs = qs.filter(local_date__gte=_parse_local_date(start, "start"))
        if end:
            qs = qs.filter(local_date__lte=_parse_local_date(end, "end"))
        if subject:
            qs = qs.filter(subject__iexact=subject)
        if status_value:
            qs = qs.filter(status=status_value)
        if schedule_item:
            qs = qs.filter(schedule_item__uuid=schedule_item)
        return qs

    def get_serializer_class(self):
        if self.action == "list":
            return StudySessionListSerializer
        if self.action == "create":
            return StudySessionStartSerializer
        return StudySessionSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        request_id = data.get("request_id")
        if request_id is not None:
            replay = StudySession.objects.filter(
                user=request.user, start_request_id=request_id
            ).first()
            if replay is not None:
                return Response(self._payload(replay), status=status.HTTP_200_OK)

        try:
            session = PomodoroService(request.user).start(
                subject=data.get("subject"),
                schedule_item=data.get("schedule_item"),
                group=data.get("group"),
                planned_pomodoros=data.get("planned_pomodoros"),
                notes=data.get("notes"),
                source_type=data.get("source_type"),
                source_id=data.get("source_id"),
                course_uuid=data.get("course_uuid"),
                is_scheduled=data.get("is_scheduled"),
                request_id=request_id,
            )
        except PomodoroError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(self._payload(session), status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["get"])
    def active(self, request):
        """The running session, or an explicit null.

        Always 200 with an ``active_session`` key: a client resuming after a cold
        start reads one shape either way, instead of branching on 204.
        """
        session = PomodoroService(request.user).get_active_session()
        return Response({"active_session": self._payload(session) if session else None})

    @action(detail=True, methods=["post"])
    def pause(self, request, pk=None):
        return self._transition("pause")

    @action(detail=True, methods=["post"])
    def resume(self, request, pk=None):
        return self._transition("resume")

    @action(detail=True, methods=["post"], url_path="complete-interval")
    def complete_interval(self, request, pk=None):
        session = self.get_object()
        interval = session.current_interval
        claimed_seconds = request.data.get("focus_seconds")
        if claimed_seconds is not None:
            try:
                claimed_seconds = drf_serializers.IntegerField(min_value=0).run_validation(
                    claimed_seconds
                )
            except drf_serializers.ValidationError as exc:
                raise drf_serializers.ValidationError({"focus_seconds": exc.detail})
            if interval is None or claimed_seconds > interval.elapsed_seconds:
                raise drf_serializers.ValidationError(
                    {"focus_seconds": "Cannot exceed the server-measured elapsed time."}
                )
        service = PomodoroService(request.user)
        try:
            session = service.complete_interval(
                session, request_id=request.data.get("request_id")
            )
        except PomodoroError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(self._payload(session))

    @action(detail=True, methods=["post"], url_path="skip-interval")
    def skip_interval(self, request, pk=None):
        return self._transition("skip_interval")

    @action(detail=True, methods=["post"])
    def interruption(self, request, pk=None):
        return self._transition("register_interruption")

    @action(detail=True, methods=["post"])
    def finish(self, request, pk=None):
        return self._transition("finish")

    @action(detail=True, methods=["post"])
    def abandon(self, request, pk=None):
        return self._transition("abandon")

    def _transition(self, method_name, **kwargs):
        session = self.get_object()
        service = PomodoroService(self.request.user)
        try:
            session = getattr(service, method_name)(session, **kwargs)
        except PomodoroError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(self._payload(session))

    def _payload(self, session):
        return StudySessionSerializer(session, context=self.get_serializer_context()).data


class ProductivityViewSet(viewsets.ViewSet):
    """Read-only analytics over closed study sessions."""

    permission_classes = [IsAuthenticated]

    def _service(self):
        return ProductivityService(self.request.user)

    @action(detail=False, methods=["get"])
    def overview(self, request):
        service = self._service()
        start, end = _analytics_window(request, service)
        return Response(service.overview(start, end))

    @action(detail=False, methods=["get"])
    def daily(self, request):
        service = self._service()
        start, end = _analytics_window(request, service)
        return Response(service.daily(start, end))

    @action(detail=False, methods=["get"])
    def subjects(self, request):
        service = self._service()
        start, end = _analytics_window(request, service)
        return Response(service.subjects(start, end))

    @action(detail=False, methods=["get"])
    def hourly(self, request):
        service = self._service()
        start, end = _analytics_window(request, service)
        return Response(service.hourly(start, end))

    @action(detail=False, methods=["get"])
    def streak(self, request):
        return Response(self._service().streaks())

    @action(detail=False, methods=["get"], url_path="exam-readiness")
    def exam_readiness(self, request):
        return Response(self._service().exam_readiness())
