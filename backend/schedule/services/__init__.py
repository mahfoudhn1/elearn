"""Service layer for the schedule app.

Re-exported here so existing call sites keep working unchanged --
``from .services import SchedulingService`` in ``views.py`` and ``serializers.py``
resolved to a module before this became a package.
"""

from .pomodoro import (
    INTERRUPTION_PENALTY,
    MAX_INTERRUPTION_PENALTY,
    STALE_SESSION_HOURS,
    PomodoroError,
    PomodoroService,
    SessionAlreadyOpen,
    SessionClosed,
)
from .productivity import DEFAULT_WINDOW_DAYS, SUBJECT_LOOKBACK_DAYS, ProductivityService
from .scheduling import BusyInterval, SchedulingService

__all__ = [
    "BusyInterval",
    "SchedulingService",
    "PomodoroService",
    "PomodoroError",
    "SessionAlreadyOpen",
    "SessionClosed",
    "ProductivityService",
    "INTERRUPTION_PENALTY",
    "MAX_INTERRUPTION_PENALTY",
    "STALE_SESSION_HOURS",
    "SUBJECT_LOOKBACK_DAYS",
    "DEFAULT_WINDOW_DAYS",
]
