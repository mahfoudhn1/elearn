"""Subject catalogue for onboarding validation.

There is no canonical Subject model in the project, and no level -> subject
mapping. This module provides a config-driven catalogue so "subject belongs to
the student's level" can be validated deterministically. The bundled catalogue
reuses the existing Arabic subject vocabulary (`users.subjsctChoice` /
`SUBJECT_OPTIONS`) for every level and is flagged ``verified=false`` -- per-level
subject lists still need real data (see ``docs/TO_VERIFY.md``).
"""

from __future__ import annotations

import json
from pathlib import Path

from planner.engine.rules import RULES_DIR

CATALOG_FILENAME = "subjects_by_level_v1.json"


def _catalog_path(path: str | Path | None = None) -> Path:
    return Path(path) if path is not None else RULES_DIR / CATALOG_FILENAME


def load_subject_catalog(path: str | Path | None = None) -> dict:
    return json.loads(_catalog_path(path).read_text(encoding="utf-8"))


def _level_keys(student) -> list[str]:
    """Level identifiers the student belongs to, most specific first."""
    keys: list[str] = []
    grade = getattr(student, "grade", None)
    if grade is not None:
        keys.append(grade.name)
        school_level = getattr(grade, "school_level", None)
        if school_level is not None:
            keys.append(school_level.name)
    stream = getattr(student, "field_of_study", None)
    if stream is not None:
        keys.append(stream.name)
    return keys


def subjects_for_student(student, path: str | Path | None = None) -> list[str]:
    """Subjects offered to the student's level (falls back to all defaults)."""
    catalog = load_subject_catalog(path)
    levels = catalog.get("levels", {})
    for key in _level_keys(student):
        if key in levels:
            return list(levels[key])
    return list(catalog.get("default_subjects", []))


def is_valid_subject(student, subject: str, path: str | Path | None = None) -> bool:
    return subject in set(subjects_for_student(student, path))
