"""Server-authoritative pomodoro timer.

Elapsed time is always derived from stored timestamps, never accepted from the
client, so a session survives an app kill, a page reload or a device switch --
whoever asks next gets the same answer.
"""

from __future__ import annotations

import logging
from datetime import timedelta

from django.db import IntegrityError, transaction
from django.db.models import Min, Sum
from django.utils import timezone

from ..models import PersonalScheduleItem, PomodoroInterval, PomodoroSettings, StudySession
from .localtime import local_date_for
from .productivity import ProductivityService

logger = logging.getLogger(__name__)

#: Each interruption costs this many points of focus score, up to the cap.
INTERRUPTION_PENALTY = 5
MAX_INTERRUPTION_PENALTY = 40

#: An open session untouched for this long is assumed forgotten. Celery is not
#: wired up in this project (see CLAUDE.md), so there is no worker to sweep them
#: -- recovery happens on read instead, in ``get_active_session``.
STALE_SESSION_HOURS = 12


class PomodoroError(Exception):
    """A pomodoro state-machine violation. Views translate these to HTTP 400."""


class SessionAlreadyOpen(PomodoroError):
    pass


class SessionClosed(PomodoroError):
    pass


class PomodoroService:
    def __init__(self, user):
        self.user = user
        self._preferences = None

    @property
    def preferences(self) -> PomodoroSettings:
        if self._preferences is None:
            self._preferences, _ = PomodoroSettings.objects.get_or_create(user=self.user)
        return self._preferences

    @property
    def offset(self) -> int:
        return self.preferences.timezone_offset_minutes

    # ------------------------------------------------------------------ reads

    def open_sessions(self):
        return StudySession.objects.filter(
            user=self.user, status__in=StudySession.OPEN_STATUSES
        )

    def get_active_session(self):
        """The session the timer is on, or None.

        Self-heals on the way through: a session left open past
        ``STALE_SESSION_HOURS`` is abandoned and rolled up here, which is what
        keeps a forgotten timer from accruing forever without a worker process.
        """
        session = self.open_sessions().first()
        if session is None:
            return None
        if self._is_stale(session):
            self.abandon(session)
            return None
        return session

    # ------------------------------------------------------------ transitions

    def start(
        self,
        *,
        subject=None,
        schedule_item: PersonalScheduleItem | None = None,
        group=None,
        planned_pomodoros=None,
        notes=None,
    ) -> StudySession:
        # Clear a forgotten session first, so a stale one cannot lock the
        # student out of ever starting another.
        self.get_active_session()

        if schedule_item is not None:
            subject = subject or schedule_item.subject
            group = group or schedule_item.group

        now = timezone.now()
        try:
            with transaction.atomic():
                if self.open_sessions().exists():
                    raise SessionAlreadyOpen(
                        "A study session is already open. Finish or abandon it first."
                    )
                session = StudySession.objects.create(
                    user=self.user,
                    schedule_item=schedule_item,
                    subject=(subject or "").strip() or None,
                    group=group,
                    status=StudySession.Status.ACTIVE,
                    started_at=now,
                    local_date=local_date_for(now, self.offset),
                    planned_pomodoros=planned_pomodoros,
                    notes=notes,
                )
                PomodoroInterval.objects.create(
                    session=session,
                    kind=PomodoroInterval.Kind.FOCUS,
                    status=PomodoroInterval.Status.RUNNING,
                    sequence=1,
                    planned_seconds=self.preferences.focus_minutes * 60,
                    started_at=now,
                    last_resumed_at=now,
                )
        except IntegrityError as exc:
            # Two starts raced past the exists() check; the partial unique
            # constraint caught the loser.
            raise SessionAlreadyOpen("A study session is already open.") from exc
        return session

    def pause(self, session: StudySession) -> StudySession:
        """Stop the clock. A no-op when already paused -- mobile double-taps are
        normal traffic, not an error worth a 400."""
        with transaction.atomic():
            session = self._lock(session)
            interval = self._require_open_interval(session)
            if interval.status == PomodoroInterval.Status.PAUSED:
                return session
            now = timezone.now()
            self._accumulate(interval, now)
            interval.status = PomodoroInterval.Status.PAUSED
            interval.last_resumed_at = None
            interval.save(update_fields=["accumulated_seconds", "status", "last_resumed_at"])
            self._set_session_status(session, StudySession.Status.PAUSED)
        return session

    def resume(self, session: StudySession) -> StudySession:
        """Restart the clock. A no-op when already running."""
        with transaction.atomic():
            session = self._lock(session)
            interval = self._require_open_interval(session)
            if interval.status == PomodoroInterval.Status.RUNNING:
                return session
            interval.status = PomodoroInterval.Status.RUNNING
            interval.last_resumed_at = timezone.now()
            interval.save(update_fields=["status", "last_resumed_at"])
            self._set_session_status(session, StudySession.Status.ACTIVE)
        return session

    def complete_interval(self, session: StudySession) -> StudySession:
        return self._close_and_advance(session, PomodoroInterval.Status.COMPLETED)

    def skip_interval(self, session: StudySession) -> StudySession:
        return self._close_and_advance(session, PomodoroInterval.Status.SKIPPED)

    def register_interruption(self, session: StudySession) -> StudySession:
        with transaction.atomic():
            session = self._lock(session)
            interval = self._require_open_interval(session)
            interval.interruptions += 1
            interval.save(update_fields=["interruptions"])
            session.interruptions += 1
            session.save(update_fields=["interruptions", "updated_at"])
        return session

    def finish(self, session: StudySession) -> StudySession:
        return self._close_session(session, StudySession.Status.COMPLETED)

    def abandon(self, session: StudySession) -> StudySession:
        """Close without credit for the running interval's status, but keep its
        time -- study that happened, happened."""
        return self._close_session(session, StudySession.Status.ABANDONED)

    # --------------------------------------------------------------- internals

    def _lock(self, session: StudySession) -> StudySession:
        return StudySession.objects.select_for_update().get(pk=session.pk, user=self.user)

    def _require_open_interval(self, session: StudySession) -> PomodoroInterval:
        if not session.is_open:
            raise SessionClosed("This study session is already closed.")
        interval = session.current_interval
        if interval is None:
            raise SessionClosed("This study session has no running interval.")
        return interval

    @staticmethod
    def _accumulate(interval: PomodoroInterval, now) -> None:
        if interval.last_resumed_at:
            ran = int((now - interval.last_resumed_at).total_seconds())
            interval.accumulated_seconds += max(ran, 0)

    def _close_interval(self, interval: PomodoroInterval, now, status: str) -> None:
        self._accumulate(interval, now)
        interval.status = status
        interval.last_resumed_at = None
        interval.ended_at = now
        interval.save(
            update_fields=["accumulated_seconds", "status", "last_resumed_at", "ended_at"]
        )

    @staticmethod
    def _credit(session: StudySession, interval: PomodoroInterval) -> None:
        seconds = interval.credited_seconds
        if interval.is_focus:
            session.total_focus_seconds += seconds
            if interval.status == PomodoroInterval.Status.COMPLETED:
                session.completed_pomodoros += 1
        else:
            session.total_break_seconds += seconds

    @staticmethod
    def _set_session_status(session: StudySession, status: str) -> None:
        if session.status != status:
            session.status = status
            session.save(update_fields=["status", "updated_at"])

    def _close_and_advance(self, session: StudySession, closed_status: str) -> StudySession:
        with transaction.atomic():
            session = self._lock(session)
            interval = self._require_open_interval(session)
            now = timezone.now()

            self._close_interval(interval, now, closed_status)
            self._credit(session, interval)
            session.save(
                update_fields=[
                    "completed_pomodoros",
                    "total_focus_seconds",
                    "total_break_seconds",
                    "updated_at",
                ]
            )

            if self._planned_work_done(session, interval):
                return self._close_session(session, StudySession.Status.COMPLETED, now=now)

            self._create_successor(session, interval, now)
        return session

    @staticmethod
    def _planned_work_done(session: StudySession, closed_interval: PomodoroInterval) -> bool:
        """True once the student has done the pomodoros they set out to do."""
        if not session.planned_pomodoros or not closed_interval.is_focus:
            return False
        return session.completed_pomodoros >= session.planned_pomodoros

    def _create_successor(
        self, session: StudySession, closed_interval: PomodoroInterval, now
    ) -> PomodoroInterval:
        """Queue the next phase from *live* preferences.

        Past intervals keep their own ``planned_seconds``, so changing the
        cadence later never rewrites history.
        """
        prefs = self.preferences
        if closed_interval.is_focus:
            long_due = prefs.is_long_break_due(session.completed_pomodoros)
            kind = (
                PomodoroInterval.Kind.LONG_BREAK if long_due else PomodoroInterval.Kind.SHORT_BREAK
            )
            minutes = prefs.long_break_minutes if long_due else prefs.short_break_minutes
            auto_start = prefs.auto_start_breaks
        else:
            kind = PomodoroInterval.Kind.FOCUS
            minutes = prefs.focus_minutes
            auto_start = prefs.auto_start_focus

        successor = PomodoroInterval.objects.create(
            session=session,
            kind=kind,
            status=(
                PomodoroInterval.Status.RUNNING if auto_start else PomodoroInterval.Status.PAUSED
            ),
            sequence=closed_interval.sequence + 1,
            planned_seconds=max(minutes, 1) * 60,
            started_at=now,
            last_resumed_at=now if auto_start else None,
        )
        self._set_session_status(
            session,
            StudySession.Status.ACTIVE if auto_start else StudySession.Status.PAUSED,
        )
        return successor

    def _close_session(self, session: StudySession, status: str, now=None) -> StudySession:
        now = now or timezone.now()
        with transaction.atomic():
            session = self._lock(session)
            if not session.is_open:
                return session

            interval = session.current_interval
            if interval is not None:
                # A timer already past its planned length counts as completed;
                # one cut short did not finish.
                final = (
                    PomodoroInterval.Status.COMPLETED
                    if interval.is_elapsed
                    else PomodoroInterval.Status.ABANDONED
                )
                self._close_interval(interval, now, final)
                self._credit(session, interval)

            session.status = status
            session.ended_at = now
            session.focus_score = self._focus_score(session)
            session.save(
                update_fields=[
                    "status",
                    "ended_at",
                    "focus_score",
                    "completed_pomodoros",
                    "total_focus_seconds",
                    "total_break_seconds",
                    "updated_at",
                ]
            )

            self._write_back_schedule_item(session)

            productivity = ProductivityService(self.user, preferences=self.preferences)
            for day in self._affected_local_dates(session):
                productivity.recompute_daily(day)

            self._record_tracking_activity(session)
        return session

    def _record_tracking_activity(self, session: StudySession) -> None:
        """Mirror a finished session into the tracking activity layer.

        This is what makes study time show up in the learner's goals, streaks
        and analytics, and what attributes it to a specific schedule item.

        Best-effort: the schedule app owns the timer, so a tracking problem
        (including its tables not being migrated yet) must never stop a session
        from closing. The session's uuid doubles as the idempotency key, so a
        retried close cannot double-count.
        """
        if session.total_focus_seconds <= 0:
            return

        try:
            from tracking.constants import STUDY_SESSION
            from tracking.services import record_activity
        except Exception:  # pragma: no cover - defensive import guard
            logger.exception("tracking app unavailable; skipping study mirror")
            return

        item = session.schedule_item
        try:
            with transaction.atomic():
                record_activity(
                    self.user,
                    STUDY_SESSION,
                    duration_seconds=session.total_focus_seconds,
                    occurred_at=session.started_at,
                    client_event_id=session.uuid,
                    metadata={
                        "session": str(session.uuid),
                        "schedule_item": str(item.uuid) if item else None,
                        "schedule_item_title": getattr(item, "title", None),
                        "subject": session.subject,
                        "completed_pomodoros": session.completed_pomodoros,
                        "focus_score": session.focus_score,
                    },
                )
        except Exception:  # pragma: no cover - never break the timer
            logger.exception(
                "failed to mirror study session %s into tracking", session.uuid
            )

    def _focus_score(self, session: StudySession) -> int:
        """Adherence to the planned focus time, less a penalty for interruptions."""
        intervals = session.intervals.filter(
            kind=PomodoroInterval.Kind.FOCUS,
            status__in=[PomodoroInterval.Status.COMPLETED, PomodoroInterval.Status.ABANDONED],
        )
        planned = sum(item.planned_seconds for item in intervals)
        actual = sum(item.credited_seconds for item in intervals)
        adherence = (actual / planned) if planned else 0
        penalty = min(session.interruptions * INTERRUPTION_PENALTY, MAX_INTERRUPTION_PENALTY)
        return max(0, min(100, round(adherence * 100) - penalty))

    def _affected_local_dates(self, session: StudySession):
        days = {local_date_for(session.started_at, self.offset)}
        if session.ended_at:
            days.add(local_date_for(session.ended_at, self.offset))
        return sorted(days)

    def _write_back_schedule_item(self, session: StudySession) -> None:
        """Fill in the tracked-time fields on the linked task or exam.

        Deliberately leaves ``status`` and ``progress_percentage`` alone -- those
        are the student's own judgement, and a time ratio is no substitute.

        Writes through ``save(update_fields=...)``, which bypasses
        ``PersonalScheduleItemSerializer.validate``. That is the point: the
        serializer runs a scheduling-conflict check that would reject this
        otherwise perfectly valid update.
        """
        item = session.schedule_item
        if item is None:
            return

        totals = StudySession.objects.filter(schedule_item=item).aggregate(
            focus=Sum("total_focus_seconds"), first_start=Min("started_at")
        )
        minutes = (totals["focus"] or 0) // 60

        changed = []
        if item.actual_duration_minutes != minutes:
            item.actual_duration_minutes = minutes
            changed.append("actual_duration_minutes")
        if item.actual_start_time is None and totals["first_start"]:
            item.actual_start_time = totals["first_start"]
            changed.append("actual_start_time")

        if changed:
            item.save(update_fields=changed + ["updated_at"])

    def _is_stale(self, session: StudySession) -> bool:
        cutoff = timezone.now() - timedelta(hours=STALE_SESSION_HOURS)
        touched = [session.updated_at, session.started_at]
        interval = session.current_interval
        if interval is not None:
            touched.append(interval.last_resumed_at or interval.started_at)
        return max(t for t in touched if t is not None) < cutoff
