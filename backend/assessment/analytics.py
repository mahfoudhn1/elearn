"""Teacher class analytics (Phase A9).

Aggregates the assessment signal of the students a teacher is responsible for:

* students of the teacher's groups (``Group.admin``) and subscriptions
  (``Subscription.teacher``);
* topic-mastery distribution;
* most-missed questions;
* common misconceptions;
* students at risk.

Privacy is the whole point: every query is scoped to the teacher's own students,
and a class (group) is only visible to its owning teacher. Thresholds here are
placeholders (see ``docs/TO_VERIFY.md`` §A9).
"""

from __future__ import annotations

from collections import defaultdict

from django.db.models import Count, Q

from groups.models import Group
from subscription.models import Subscription
from users.models import Student

from .models import AttemptAnswer, TopicMastery

#: A trustworthy mastery below this is "weak" for distribution buckets.
WEAK_THRESHOLD = 0.4
DEVELOPING_THRESHOLD = 0.6
SECURE_THRESHOLD = 0.8

#: A student whose mean trustworthy mastery is below this is "at risk".
AT_RISK_THRESHOLD = 0.5

#: Cap the most-missed / misconception lists so a class payload stays small.
MOST_MISSED_LIMIT = 20
MISCONCEPTION_LIMIT = 20


def teacher_students(teacher):
    """Students in the teacher's groups or with a subscription to the teacher."""
    group_ids = Group.objects.filter(admin=teacher).values_list("id", flat=True)
    group_student_ids = (
        Group.students.through.objects.filter(group_id__in=list(group_ids))
        .values_list("student_id", flat=True)
    )
    subscription_student_ids = Subscription.objects.filter(
        teacher=teacher
    ).values_list("student_id", flat=True)
    ids = set(group_student_ids) | set(subscription_student_ids)
    return Student.objects.filter(id__in=ids).distinct()


def teacher_groups(teacher):
    return Group.objects.filter(admin=teacher).order_by("name", "id")


def group_students(teacher, group: Group):
    """Students of one group, or ``None`` when the group is not the teacher's."""
    if group.admin_id != teacher.id:
        return None
    return group.students.all().distinct()


def _bucket(mastery, confidence: str) -> str:
    if mastery is None or confidence == "NONE":
        return "no_data"
    if mastery < WEAK_THRESHOLD:
        return "weak"
    if mastery < DEVELOPING_THRESHOLD:
        return "developing"
    if mastery < SECURE_THRESHOLD:
        return "secure"
    return "strong"


def topic_mastery_distribution(students) -> list[dict]:
    """Per-topic distribution of the class's trustworthy mastery."""
    entries = (
        TopicMastery.objects.filter(student__in=students)
        .select_related("topic__chapter")
        .order_by("topic__uuid")
    )
    topics: dict[int, dict] = {}
    for entry in entries:
        topic = entry.topic
        row = topics.setdefault(
            topic.id,
            {
                "topic": str(topic.uuid),
                "subject": topic.chapter.subject,
                "title_ar": topic.title_ar,
                "title_fr": topic.title_fr,
                "students_with_evidence": 0,
                "distribution": {
                    "no_data": 0,
                    "weak": 0,
                    "developing": 0,
                    "secure": 0,
                    "strong": 0,
                },
                "_sum": 0.0,
                "_count": 0,
            },
        )
        bucket = _bucket(entry.mastery, entry.confidence)
        row["distribution"][bucket] += 1
        if bucket != "no_data":
            row["students_with_evidence"] += 1
            row["_sum"] += float(entry.mastery)
            row["_count"] += 1

    out = []
    for row in topics.values():
        count = row.pop("_count")
        total = row.pop("_sum")
        row["avg_mastery"] = round(total / count, 4) if count else None
        out.append(row)
    out.sort(key=lambda item: item["topic"])
    return out


def most_missed_questions(students, limit: int = MOST_MISSED_LIMIT) -> list[dict]:
    """Questions with the highest wrong-answer rate in the class."""
    rows = (
        AttemptAnswer.objects.filter(attempt__student__in=students)
        .values("question_id")
        .annotate(
            total=Count("id"),
            wrong=Count("id", filter=Q(is_correct=False)),
        )
        .filter(total__gt=0)
        .order_by("-wrong", "-total")
    )
    from .models import Question

    question_ids = [row["question_id"] for row in rows[: limit * 2]]
    questions = {
        question.id: question
        for question in Question.objects.filter(id__in=question_ids).select_related(
            "topic"
        )
    }
    out = []
    for row in rows:
        question = questions.get(row["question_id"])
        if question is None:
            continue
        total = row["total"]
        wrong = row["wrong"]
        out.append(
            {
                "question": str(question.uuid),
                "topic": str(question.topic.uuid),
                "prompt_ar": question.prompt_ar,
                "prompt_fr": question.prompt_fr,
                "difficulty": question.difficulty,
                "attempts": total,
                "wrong": wrong,
                "wrong_rate": round(wrong / total, 4) if total else 0.0,
            }
        )
        if len(out) >= limit:
            break
    return out


def common_misconceptions(students, limit: int = MISCONCEPTION_LIMIT) -> list[dict]:
    """Misconceptions the class trips on most often."""
    rows = (
        AttemptAnswer.objects.filter(
            attempt__student__in=students, misconception__isnull=False
        )
        .values(
            "misconception_id",
            "misconception__code",
            "misconception__topic__uuid",
            "misconception__description_ar",
            "misconception__description_fr",
        )
        .annotate(count=Count("id"))
        .order_by("-count")
    )
    out = []
    for row in rows[:limit]:
        out.append(
            {
                "misconception": str(row["misconception_id"]),
                "code": row["misconception__code"],
                "topic": str(row["misconception__topic__uuid"]),
                "description_ar": row["misconception__description_ar"],
                "description_fr": row["misconception__description_fr"],
                "count": row["count"],
            }
        )
    return out


def students_at_risk(students) -> list[dict]:
    """Students whose mean trustworthy mastery is below the risk threshold."""
    entries = (
        TopicMastery.objects.filter(student__in=students, confidence__isnull=False)
        .exclude(confidence="NONE")
        .exclude(mastery__isnull=True)
        .select_related("student__user", "topic")
    )
    by_student: dict[int, dict] = defaultdict(
        lambda: {"sum": 0.0, "count": 0, "weak": []}
    )
    student_objs: dict[int, Student] = {}
    for entry in entries:
        student_objs[entry.student_id] = entry.student
        record = by_student[entry.student_id]
        record["sum"] += float(entry.mastery)
        record["count"] += 1
        if entry.mastery < AT_RISK_THRESHOLD:
            record["weak"].append(
                {
                    "topic": str(entry.topic.uuid),
                    "mastery": round(float(entry.mastery), 4),
                }
            )

    out = []
    for student_id, record in by_student.items():
        if record["count"] == 0:
            continue
        average = record["sum"] / record["count"]
        if average >= AT_RISK_THRESHOLD:
            continue
        student = student_objs[student_id]
        out.append(
            {
                "student": str(student.uuid),
                "name": student.user.get_full_name().strip() or student.user.username,
                "avg_mastery": round(average, 4),
                "topics_with_evidence": record["count"],
                "weak_topics": sorted(
                    record["weak"], key=lambda item: item["mastery"]
                )[:10],
            }
        )
    out.sort(key=lambda item: item["avg_mastery"])
    return out


def class_analytics(students) -> dict:
    """The full analytics payload for a set of students."""
    student_list = list(students)
    return {
        "student_count": len(student_list),
        "topic_mastery": topic_mastery_distribution(students),
        "most_missed_questions": most_missed_questions(students),
        "common_misconceptions": common_misconceptions(students),
        "students_at_risk": students_at_risk(students),
    }