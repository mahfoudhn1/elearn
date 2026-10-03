"""Pure scheduling engine (no Django, no DB, no network, no clock)."""

from .allocate import (
    Candidate,
    EngineInput,
    EngineOutput,
    ExamInput,
    PlannedSessionDTO,
    PlannerPreferences,
    ScoreContext,
    UnmetDemand,
    explain_score,
    generate_plan,
    session_length_for,
)
from .allocation_rules import AllocationWeights, PriorityWeights, SoftWeights
from .demand import (
    DemandActivity,
    DemandUnit,
    DemandWindow,
    ExamState,
    HistorySummary,
    Reason,
    StudentState,
    SubjectState,
    compute_demand,
)
from .dto import ActivityType, BlockSource, BusyBlock, DayContext, FreeInterval
from .history import ActivityStats, HistoryRecord, HistorySummary, build_history_summary
from .pedagogy import (
    FollowupChain,
    HistoryRules,
    PedagogyRules,
    SessionLength,
    load_pedagogy_rules,
)
from .priority import RankedDemand, rank_demands, tier_for
from .rules import EngineRules, load_rules
from .scheduling import (
    compute_free_intervals,
    daily_capacity,
    merge_blocks,
    sort_blocks,
)

__all__ = [
    "ActivityStats",
    "ActivityType",
    "AllocationWeights",
    "BlockSource",
    "BusyBlock",
    "Candidate",
    "DayContext",
    "DemandActivity",
    "DemandUnit",
    "DemandWindow",
    "EngineInput",
    "EngineOutput",
    "EngineRules",
    "ExamInput",
    "ExamState",
    "FollowupChain",
    "FreeInterval",
    "HistoryRecord",
    "HistoryRules",
    "HistorySummary",
    "PedagogyRules",
    "PlannedSessionDTO",
    "PlannerPreferences",
    "PriorityWeights",
    "RankedDemand",
    "Reason",
    "ScoreContext",
    "SessionLength",
    "SoftWeights",
    "StudentState",
    "SubjectState",
    "compute_demand",
    "compute_free_intervals",
    "daily_capacity",
    "build_history_summary",
    "explain_score",
    "generate_plan",
    "load_pedagogy_rules",
    "load_rules",
    "merge_blocks",
    "rank_demands",
    "session_length_for",
    "sort_blocks",
    "tier_for",
]
