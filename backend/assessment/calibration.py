"""Calibration report (Phase A10, staff).

Correlates each student's subject readiness (A3) with the teacher grade recorded
for that subject, per subject, with the sample size. A subject with fewer than
``calibration_min_samples`` paired students is reported but not significant.

Read-only and staff-only (enforced by the view).
"""

from __future__ import annotations

from . import services_mastery
from .engine.calibration import pearson
from .engine.item_analysis_rules import load_item_analysis_rules
from .models import TeacherGrade


def build_calibration_report() -> dict:
    rules = load_item_analysis_rules()
    grades = list(
        TeacherGrade.objects.select_related("student").order_by("subject", "student_id")
    )

    by_subject: dict[str, list[tuple[float, float]]] = {}
    for grade in grades:
        result = services_mastery.compute_subject_result(grade.student, grade.subject)
        if result.value is None or result.confidence == "NONE":
            # Not enough trustworthy readiness for this student yet.
            continue
        by_subject.setdefault(grade.subject, []).append(
            (float(result.value), float(grade.ratio))
        )

    subjects = []
    for subject in sorted(by_subject):
        pairs = by_subject[subject]
        correlation, n = pearson(pairs)
        mean_readiness = (
            round(sum(x for x, _ in pairs) / n, 6) if n else None
        )
        mean_grade = round(sum(y for _, y in pairs) / n, 6) if n else None
        subjects.append(
            {
                "subject": subject,
                "n": n,
                "correlation": correlation,
                "significant": n >= rules.calibration_min_samples,
                "min_samples": rules.calibration_min_samples,
                "mean_readiness": mean_readiness,
                "mean_grade": mean_grade,
            }
        )

    return {
        "graded_students": len(grades),
        "min_samples": rules.calibration_min_samples,
        "subjects": subjects,
    }
