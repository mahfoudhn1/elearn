"""Named constants for the planner app.

Phase 1 only. No curriculum, coefficients, weekly hours or other pedagogical
numbers live here -- those belong in versioned config/rule sets (Principle 4).
The few limits below are structural bounds (a day has 24 hours, a weekday is
0-6), not educational facts.
"""

from tracking.constants import DEFAULT_DAILY_GOAL_MINUTES, DEFAULT_TIMEZONE

# Reused from the tracking app so there is a single source for these defaults.
DEFAULT_STUDENT_TIMEZONE = DEFAULT_TIMEZONE
DEFAULT_DAILY_STUDY_TARGET_MINUTES = DEFAULT_DAILY_GOAL_MINUTES

# Python ``date.weekday()`` convention: Monday = 0 ... Sunday = 6.
WEEKDAY_MIN = 0
WEEKDAY_MAX = 6

# A day has 1440 minutes; both fields are ceilings, not targets.
MAX_MINUTES_IN_DAY = 24 * 60

DEFAULT_WEEK_START = "SUNDAY"
