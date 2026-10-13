"""Deterministic weekly study planning and curriculum assignment."""

from __future__ import annotations

import json
import math
from datetime import date, datetime, time, timedelta
from pathlib import Path

from .config import (
    DAILY_CAPACITY,
    LEARN_PHASE_SHARE,
    MAX_SESSIONS_PER_SUBJECT_PER_DAY,
    MAX_SESSION_MINUTES,
    MAX_SUBJECTS_PER_DAY,
    MIN_SESSION_MINUTES,
    SCHOOL_WEEK,
    SUBJECT_CONFIG,
    TARGET_SESSION_MINUTES,
    TIER_C_MAINTENANCE_SHARE,
    WEEKLY_BUFFER_SHARE,
)

CURRICULUM_DIR = Path(__file__).resolve().parent / "curriculum"


def stream_key(grade: str, stream: str) -> str:
    grade = grade.strip().replace(" ", "").upper()
    stream = stream.strip().lower()
    if "math" in stream or "رياض" in stream:
        suffix = "math"
    elif "exp" in stream or "science" in stream or "علوم" in stream or "تجريب" in stream:
        suffix = "exp"
    else:
        suffix = stream.replace(" ", "_")
    return f"{grade}_{suffix}"


def weekly_capacity(level: str) -> tuple[dict[int, int], int]:
    level_key = level.strip().replace(" ", "").upper()
    caps = DAILY_CAPACITY.get(level_key, DAILY_CAPACITY["3AS"])
    day_caps = {}
    for weekday in range(7):
        if weekday == SCHOOL_WEEK["friday"]:
            day_caps[weekday] = caps["weekend"] // 2
        elif weekday in SCHOOL_WEEK["weekend"]:
            day_caps[weekday] = caps["weekend"]
        else:
            day_caps[weekday] = caps["weekday"]
    gross = sum(day_caps.values())
    usable = math.floor(gross * (1 - WEEKLY_BUFFER_SHARE) / 5) * 5
    return day_caps, usable


def _largest_remainder(total_minutes: int, weights: dict[str, float]) -> dict[str, int]:
    units = total_minutes // 5
    weight_sum = sum(weights.values())
    if not units or not weight_sum:
        return {key: 0 for key in weights}
    exact = {key: units * weight / weight_sum for key, weight in weights.items()}
    allocated = {key: int(value) for key, value in exact.items()}
    remainder = units - sum(allocated.values())
    for key in sorted(weights, key=lambda item: (-(exact[item] - allocated[item]), item))[:remainder]:
        allocated[key] += 1
    return {key: value * 5 for key, value in allocated.items()}


def allocate_weekly_minutes(
    stream: str,
    usable_minutes: int,
    weakness: dict[str, float] | None = None,
    days_since_studied: dict[str, int] | None = None,
    rotation: int = 0,
) -> dict[str, int]:
    subjects = SUBJECT_CONFIG.get(stream, {})
    weakness = weakness or {}
    days_since_studied = days_since_studied or {}
    maintenance_budget = int(usable_minutes * TIER_C_MAINTENANCE_SHARE // 5) * 5
    maintenance_count = maintenance_budget // MIN_SESSION_MINUTES
    tier_c = [(name, data) for name, data in subjects.items() if data["tier"] == "C"]
    ranked = sorted(
        tier_c,
        key=lambda pair: (
            -(pair[1]["coefficient"]
              * (1 + max(0.0, min(1.0, weakness.get(pair[0], 0.0)))
                 * (1 + max(0, days_since_studied.get(pair[0], 7)) / 7))),
            pair[0],
        ),
    )
    chosen = [name for name, _ in ranked[rotation % len(ranked):] + ranked[:rotation % len(ranked)]]
    chosen = chosen[:maintenance_count]
    result = {name: 0 for name in subjects}
    c_minutes = min(maintenance_budget, usable_minutes)
    if chosen and c_minutes >= MIN_SESSION_MINUTES:
        each = min(40, c_minutes // len(chosen)) // 5 * 5
        each = max(MIN_SESSION_MINUTES, each)
        for name in chosen:
            result[name] = each
        while sum(result.values()) > c_minutes:
            result[chosen[-1]] -= 5
            if result[chosen[-1]] < MIN_SESSION_MINUTES:
                result[chosen[-1]] = 0
                chosen.pop()
                if not chosen:
                    break
    committed = sum(result.values())
    if committed > usable_minutes:
        return {name: 0 for name in result}
    core = {name: data for name, data in subjects.items() if data["tier"] != "C"}
    weights = {
        name: data["coefficient"] * (1 + 0.5 * min(1.0, max(0.0, weakness.get(name, 0.0))))
        for name, data in core.items()
    }
    for name, minutes in _largest_remainder(usable_minutes - committed, weights).items():
        result[name] = minutes
    return result


def _split_minutes(minutes: int, tier: str) -> list[int]:
    if minutes < MIN_SESSION_MINUTES:
        return []
    count = max(1, math.ceil(minutes / TARGET_SESSION_MINUTES))
    while count > 1 and minutes // count < MIN_SESSION_MINUTES:
        count -= 1
    base, extra = divmod(minutes, count)
    parts = [base + (1 if index < extra else 0) for index in range(count)]
    # Move five-minute units from overlong parts to short parts where possible.
    for index, value in enumerate(parts):
        while value > MAX_SESSION_MINUTES:
            receiver = next((i for i, part in enumerate(parts) if part < MAX_SESSION_MINUTES), None)
            if receiver is None:
                break
            parts[index] -= 5
            parts[receiver] += 5
            value = parts[index]
    return [value for value in parts if MIN_SESSION_MINUTES <= value <= MAX_SESSION_MINUTES]


def _load_topics(stream: str, subject: str) -> list[dict]:
    path = CURRICULUM_DIR / stream / f"{subject}.json"
    try:
        with path.open(encoding="utf-8") as curriculum_file:
            return sorted(json.load(curriculum_file).get("topics", []), key=lambda row: (row["order"], row["id"]))
    except (OSError, ValueError, KeyError, TypeError):
        return []


def generate_week(
    *,
    grade: str,
    stream: str,
    week_start: date,
    weakness: dict[str, float] | None = None,
    days_since_studied: dict[str, int] | None = None,
    progress: dict[str, dict] | None = None,
    timezone_info=None,
    start_hour: int = 9,
) -> dict:
    key = stream_key(grade, stream)
    if key not in SUBJECT_CONFIG:
        return {"sessions": [], "unplaced": [], "usable_minutes": 0}
    day_caps, usable = weekly_capacity(grade)
    allocation = allocate_weekly_minutes(
        key, usable, weakness, days_since_studied,
        rotation=week_start.isocalendar().week,
    )
    tasks = []
    for subject, data in SUBJECT_CONFIG[key].items():
        for minutes in _split_minutes(allocation[subject], data["tier"]):
            tasks.append({"subject": subject, "tier": data["tier"], "minutes": minutes,
                          "coefficient": data["coefficient"]})
    tasks.sort(key=lambda row: (-row["minutes"], row["tier"], -row["coefficient"], row["subject"]))

    days = [{"date": week_start + timedelta(days=i), "minutes": 0, "subjects": set(), "counts": {}, "sessions": []}
            for i in range(7)]
    unplaced = []
    for task in tasks:
        candidates = []
        for index, day in enumerate(days):
            weekday = day["date"].weekday()
            weekend = weekday in SCHOOL_WEEK["weekend"]
            if day["minutes"] + task["minutes"] > day_caps[weekday]:
                continue
            if len(day["subjects"] | {task["subject"]}) > MAX_SUBJECTS_PER_DAY["weekend" if weekend else "weekday"]:
                continue
            if day["counts"].get(task["subject"], 0) >= MAX_SESSIONS_PER_SUBJECT_PER_DAY["weekend" if weekend else "weekday"]:
                continue
            previous_days = [j for j, other in enumerate(days) if other["counts"].get(task["subject"], 0)]
            adjacency = min((abs(index - j) for j in previous_days), default=99) == 1
            candidates.append((adjacency, day["minutes"] / max(day_caps[weekday], 1), day["minutes"], index))
        if not candidates:
            unplaced.append(task)
            continue
        _, _, _, index = min(candidates)
        day = days[index]
        day["minutes"] += task["minutes"]
        day["subjects"].add(task["subject"])
        day["counts"][task["subject"]] = day["counts"].get(task["subject"], 0) + 1
        day["sessions"].append(task.copy())

    sessions = []
    for day in days:
        day["sessions"].sort(key=lambda row: (row["tier"], -row["minutes"], row["subject"]))
        day_offset = 0
        for task in day["sessions"]:
            subject_progress = (progress or {}).get(task["subject"], {})
            topics = _load_topics(key, task["subject"])
            done = int(subject_progress.get("minutes", 0))
            topic_index = int(subject_progress.get("topic_index", 0))
            if topic_index < len(topics):
                topic = topics[topic_index]
            else:
                topic = min(topics, key=lambda row: (float(subject_progress.get("mastery", {}).get(row["id"], 0)), row["order"])) if topics else None
            topic_minutes = int(topic["est_minutes"]) if topic else 0
            part = parts = None
            phase = "learn"
            if topic:
                topic_done = int(subject_progress.get("topic_minutes", 0)) if subject_progress.get("topic_id") == topic.get("id") else 0
                part = min(topic_done // task["minutes"] + 1, math.ceil(topic_minutes / task["minutes"]))
                parts = math.ceil(topic_minutes / task["minutes"])
                phase = "learn" if topic_done < topic_minutes * LEARN_PHASE_SHARE else "practice"
            local_day = day["date"]
            start_dt = datetime.combine(local_day, time(start_hour), tzinfo=timezone_info)
            # Stable stagger keeps sessions on the same day non-overlapping.
            start_dt += timedelta(minutes=day_offset)
            day_offset += task["minutes"]
            sessions.append({
                "type": "study", "label": "STUDY", "day": local_day.isoformat(),
                "subject": task["subject"], "minutes": task["minutes"],
                "topic_id": topic.get("id") if topic else None,
                "topic_title_ar": topic.get("title_ar") if topic else None,
                "phase": phase, "part": part, "parts": parts,
                "review_topic_id": None,
                "start_dt": start_dt,
                "end_dt": start_dt + timedelta(minutes=task["minutes"]),
            })
            if topic:
                subject_progress["minutes"] = done + task["minutes"]
                subject_progress["topic_id"] = topic.get("id")
                subject_progress["topic_minutes"] = topic_done + task["minutes"]
                if topic_done + task["minutes"] >= topic_minutes and topic_index < len(topics):
                    subject_progress["topic_index"] = topic_index + 1
                    subject_progress["topic_minutes"] = 0
                (progress or {}).setdefault(task["subject"], subject_progress)
    return {"sessions": sessions, "unplaced": unplaced, "usable_minutes": usable}
