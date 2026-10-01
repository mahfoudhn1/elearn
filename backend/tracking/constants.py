"""Shared constants for the tracking app.

Event type names are kept here so models, services, serializers and tests all
refer to the same strings.
"""

# Event types a client is allowed to POST. Anything else written through the
# public API is rejected; server-side code uses record_activity() directly and
# is not limited to this set.
COURSE_VIEWED = "COURSE_VIEWED"
VIDEO_WATCH = "VIDEO_WATCH"
LESSON_STARTED = "LESSON_STARTED"
QUIZ_STARTED = "QUIZ_STARTED"

CLIENT_EVENT_TYPES = frozenset(
    {
        COURSE_VIEWED,
        VIDEO_WATCH,
        LESSON_STARTED,
        QUIZ_STARTED,
    }
)

# Event types only the server may write. LESSON_COMPLETED and QUIZ_SUBMITTED are
# derived from real completion state, never trusted from a client.
LESSON_COMPLETED = "LESSON_COMPLETED"
QUIZ_SUBMITTED = "QUIZ_SUBMITTED"
STUDY_SESSION = "STUDY_SESSION"
GOAL_MET = "GOAL_MET"

SERVER_EVENT_TYPES = frozenset(
    {
        LESSON_COMPLETED,
        QUIZ_SUBMITTED,
        STUDY_SESSION,
        GOAL_MET,
    }
)

ALL_EVENT_TYPES = CLIENT_EVENT_TYPES | SERVER_EVENT_TYPES

# Timezone used when a user has no tracking settings yet. Algeria is UTC+1.
DEFAULT_TIMEZONE = "Africa/Algiers"

# First day of a week, using Python's datetime.weekday() convention
# (Monday = 0 ... Sunday = 6). Change this single constant to move the week
# boundary; SATURDAY = 5, SUNDAY = 6. Default: Sunday.
WEEK_START_DAY = 6

# Clock-skew tolerance for client-supplied occurred_at.
MAX_FUTURE_SKEW_MINUTES = 5

# How far back a client may backdate an event.
MAX_BACKDATE_DAYS = 7

# Upper bound on a single event's duration (4 hours).
MAX_DURATION_SECONDS = 4 * 60 * 60

# --- Study goals ----------------------------------------------------------

MAX_ACTIVE_GOALS = 3

# Sensible per-metric ceilings, keyed by (metric value, period value).
# A daily watch goal cannot exceed 24h; a weekly one 7x that.
METRIC_MAX_TARGET = {
    ("WATCH_MINUTES", "DAILY"): 24 * 60,
    ("WATCH_MINUTES", "WEEKLY"): 24 * 60 * 7,
    ("STUDY_MINUTES", "DAILY"): 24 * 60,
    ("STUDY_MINUTES", "WEEKLY"): 24 * 60 * 7,
    ("LESSONS_COMPLETED", "DAILY"): 100,
    ("LESSONS_COMPLETED", "WEEKLY"): 700,
    ("QUIZZES_SUBMITTED", "DAILY"): 100,
    ("QUIZZES_SUBMITTED", "WEEKLY"): 700,
}


def max_target_for(metric, period):
    """Return the maximum allowed target for a metric/period pair."""
    return METRIC_MAX_TARGET.get((metric, period), 10000)


# Sensible floors, used for new users with no history and by suggest_target.
METRIC_MIN_TARGET = {
    ("WATCH_MINUTES", "DAILY"): 30,
    ("WATCH_MINUTES", "WEEKLY"): 120,
    ("STUDY_MINUTES", "DAILY"): 30,
    ("STUDY_MINUTES", "WEEKLY"): 120,
    ("LESSONS_COMPLETED", "DAILY"): 1,
    ("LESSONS_COMPLETED", "WEEKLY"): 5,
    ("QUIZZES_SUBMITTED", "DAILY"): 1,
    ("QUIZZES_SUBMITTED", "WEEKLY"): 3,
}


def min_target_for(metric, period):
    return METRIC_MIN_TARGET.get((metric, period), 1)


# Metric -> the event type that drives it, used for per-course goals which are
# computed from ActivityEvent (DailyActivity has no course dimension).
METRIC_EVENT_TYPE = {
    "WATCH_MINUTES": VIDEO_WATCH,
    "STUDY_MINUTES": STUDY_SESSION,
    "LESSONS_COMPLETED": LESSON_COMPLETED,
    "QUIZZES_SUBMITTED": QUIZ_SUBMITTED,
}


