"""Editable rule-based study planner configuration.

Subject coefficients are placeholders and must be verified against official
Algerian Ministry tables before production use.
"""

from __future__ import annotations

SUBJECT_CONFIG = {
    "3AS_math": {
        "math": {"coefficient": 7, "tier": "A"},
        "physics": {"coefficient": 6, "tier": "A"},
        "arabic": {"coefficient": 3, "tier": "B"},
        "svt": {"coefficient": 2, "tier": "C"},
        "philosophy": {"coefficient": 2, "tier": "C"},
        "french": {"coefficient": 2, "tier": "C"},
        "english": {"coefficient": 2, "tier": "C"},
        "history-geography": {"coefficient": 2, "tier": "C"},
        "islamic": {"coefficient": 2, "tier": "C"},
    },
    "3AS_exp": {
        "svt": {"coefficient": 6, "tier": "A"},
        "physics": {"coefficient": 5, "tier": "A"},
        "math": {"coefficient": 5, "tier": "A"},
        "arabic": {"coefficient": 3, "tier": "B"},
        "philosophy": {"coefficient": 2, "tier": "C"},
        "french": {"coefficient": 2, "tier": "C"},
        "english": {"coefficient": 2, "tier": "C"},
        "history-geography": {"coefficient": 2, "tier": "C"},
        "islamic": {"coefficient": 2, "tier": "C"},
    },
}

SUBJECT_COEFFICIENTS_REQUIRE_VERIFICATION = True
DAILY_CAPACITY = {
    "1AS": {"weekday": 90, "weekend": 180},
    "2AS": {"weekday": 120, "weekend": 240},
    "3AS": {"weekday": 150, "weekend": 300},
}
SCHOOL_WEEK = {"weekdays": (6, 0, 1, 2, 3), "weekend": (4, 5), "friday": 4}
MIN_SESSION_MINUTES = 25
MAX_SESSION_MINUTES = 60
TARGET_SESSION_MINUTES = 50
WEEKLY_BUFFER_SHARE = 0.15
TIER_C_MAINTENANCE_SHARE = 0.12
MAX_SUBJECTS_PER_DAY = {"weekday": 3, "weekend": 4}
MAX_SESSIONS_PER_SUBJECT_PER_DAY = {"weekday": 1, "weekend": 2}
MASTERY_THRESHOLD = 0.6
LEARN_PHASE_SHARE = 0.60
SPACED_REVIEW_GAPS_DAYS = (1, 3, 7, 14, 30)
