"""Curriculum models/import + optional topic wiring tests."""

from datetime import date, datetime, time, timedelta, timezone as dt_timezone
import json
from pathlib import Path

from django.core.management import call_command
from django.db import IntegrityError, transaction
from django.test import SimpleTestCase, TestCase
from django.utils import timezone

from planner import factories
from planner.adapters.demand_inputs import (
    build_curriculum_topics,
    build_recent_topics,
    build_student_state,
)
from planner.engine import (
    DayContext,
    DemandActivity,
    DemandUnit,
    EngineInput,
    PlannerPreferences,
    generate_plan,
    load_rules,
)
from planner.engine.allocate import Candidate, ScoreContext, explain_score
from planner.models import (
    AcademicYear,
    Chapter,
    CurriculumVersion,
    LearningObjective,
    PlannerExam,
    StudentTopicProgress,
    SubjectCurrentTopic,
    Topic,
)
from schedule.models import PersonalScheduleItem, StudySession

MATH = "رياضيات"
RULES = load_rules()


class CurriculumImportTests(TestCase):
    def test_json_import_creates_unverified_curriculum_and_is_idempotent(self):
        fixture = json.loads(
            (Path(__file__).parent / "fixtures" / "curriculum.sample.json").read_text(
                encoding="utf-8"
            )
        )
        expected_topics = [
            topic
            for chapter in fixture["chapters"]
            for topic in chapter.get("topics", [])
        ]
        expected_objectives = sum(len(topic.get("objectives", [])) for topic in expected_topics)

        call_command("import_curriculum", create_year=True)
        year = AcademicYear.objects.get(label=fixture["academic_year"])
        curriculum = CurriculumVersion.objects.get(
            academic_year=year,
            level=fixture.get("level", ""),
            stream=fixture.get("stream", ""),
        )
        self.assertFalse(curriculum.verified)
        self.assertEqual(Chapter.objects.count(), len(fixture["chapters"]))
        self.assertEqual(Topic.objects.count(), len(expected_topics))
        self.assertEqual(LearningObjective.objects.count(), expected_objectives)
        topic = Topic.objects.order_by("chapter__order", "order").first()
        self.assertEqual(topic.trimester, 1)
        self.assertEqual(topic.estimated_minutes, expected_topics[0].get("estimated_minutes", 60))
        self.assertFalse(topic.is_published)

        call_command("import_curriculum", create_year=True)
        self.assertEqual(Chapter.objects.count(), len(fixture["chapters"]))
        self.assertEqual(Topic.objects.count(), len(expected_topics))
        self.assertEqual(LearningObjective.objects.count(), expected_objectives)

    def test_csv_import(self):
        csv_path = Path("/tmp/planner_curriculum_sample.csv")
        csv_path.write_text(
            "subject,chapter_order,chapter_title_ar,chapter_title_fr,chapter_weight,"
            "topic_order,topic_title_ar,topic_title_fr\n"
            "PLACEHOLDER,1,فصل,PLACEHOLDER C1,3,1,موضوع,PLACEHOLDER T1\n"
            "PLACEHOLDER,1,فصل,PLACEHOLDER C1,3,2,موضوع,PLACEHOLDER T2\n",
            encoding="utf-8",
        )
        try:
            call_command("import_curriculum", path=str(csv_path), create_year=True)
        finally:
            csv_path.unlink(missing_ok=True)
        self.assertEqual(Chapter.objects.count(), 1)
        self.assertEqual(Topic.objects.count(), 2)

    def test_topic_progress_unique_per_student(self):
        call_command("import_curriculum", create_year=True)
        topic = Topic.objects.first()
        student = factories.make_student()
        StudentTopicProgress.objects.create(student=student, topic=topic)
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                StudentTopicProgress.objects.create(student=student, topic=topic)


class RecentTopicTests(TestCase):
    def setUp(self):
        call_command("import_curriculum", create_year=True)
        self.topic = Topic.objects.order_by("id").first()
        self.student = factories.make_student()

    def test_planner_exam_topic_flows_into_student_state(self):
        PlannerExam.objects.create(
            student=self.student, subject=MATH, exam_date=date(2099, 5, 1), exam_type="BAC", topic=self.topic
        )
        state = build_student_state(self.student)
        self.assertEqual(state.exams[0].topic_id, str(self.topic.pk))

    def test_build_recent_topics(self):
        StudentTopicProgress.objects.create(
            student=self.student,
            topic=self.topic,
            status=StudentTopicProgress.Status.COVERED,
            last_studied_at=timezone.make_aware(datetime(2099, 9, 7, 18, 0)),
        )
        recent = build_recent_topics(self.student)
        self.assertEqual(recent[str(self.topic.pk)], date(2099, 9, 7))

    def test_curriculum_topics_skip_mastered_and_keep_order_from_current_topic(self):
        level = self.student.grade.school_level.name
        stream = self.student.field_of_study.name
        academic_year = factories.make_academic_year()
        curriculum = CurriculumVersion.objects.create(
            academic_year=academic_year,
            level=level,
            stream=stream,
            status=CurriculumVersion.Status.ACTIVE,
        )
        chapter = Chapter.objects.create(curriculum=curriculum, subject=MATH, order=1)
        topics = [
            Topic.objects.create(
                chapter=chapter,
                order=order,
                trimester=1,
                is_published=True,
                title_ar=f"Topic {order}",
            )
            for order in range(1, 5)
        ]
        StudentTopicProgress.objects.create(
            student=self.student,
            topic=topics[0],
            status=StudentTopicProgress.Status.MASTERED,
        )
        SubjectCurrentTopic.objects.create(
            student=self.student,
            subject=MATH,
            topic=topics[2],
        )

        ordered = build_curriculum_topics(self.student)[MATH]

        self.assertEqual([item.topic_id for item in ordered], [str(topics[2].pk), str(topics[3].pk), str(topics[1].pk)])

    def test_mastered_current_topic_continues_forward(self):
        level = self.student.grade.school_level.name
        stream = self.student.field_of_study.name
        curriculum = CurriculumVersion.objects.create(
            academic_year=factories.make_academic_year(),
            level=level,
            stream=stream,
            status=CurriculumVersion.Status.ACTIVE,
        )
        chapter = Chapter.objects.create(curriculum=curriculum, subject=MATH, order=1)
        topics = [
            Topic.objects.create(
                chapter=chapter,
                order=order,
                trimester=1,
                is_published=True,
                title_ar=f"Topic {order}",
            )
            for order in range(1, 5)
        ]
        StudentTopicProgress.objects.create(
            student=self.student,
            topic=topics[1],
            status=StudentTopicProgress.Status.MASTERED,
        )
        SubjectCurrentTopic.objects.create(student=self.student, subject=MATH, topic=topics[1])

        ordered = build_curriculum_topics(self.student)[MATH]

        self.assertEqual(
            [item.topic_id for item in ordered],
            [str(topics[2].pk), str(topics[3].pk), str(topics[0].pk)],
        )


class TopicScoringTests(SimpleTestCase):
    def test_topic_recency_contributes_to_score(self):
        day = DayContext(date=date(2099, 9, 7), wake_min=360, sleep_min=1380)
        demand = DemandUnit(MATH, DemandActivity.STUDY, 60, None, None, topic_id="42")
        candidate = Candidate(day.date, 1080, 1140, 60)
        base = ScoreContext(
            day=day, used_minutes=0, capacity_minutes=200, placed_sessions=(),
            lessons=(), demand=demand, session_length=60, preferred_period="NONE",
        )
        scored = ScoreContext(
            day=day, used_minutes=0, capacity_minutes=200, placed_sessions=(),
            lessons=(), demand=demand, session_length=60, preferred_period="NONE",
            topic_recency=0.7,
        )
        self.assertNotIn("topic_recency", explain_score(candidate, base, RULES))
        self.assertEqual(explain_score(candidate, scored, RULES)["topic_recency"], 0.7)

    def test_planning_works_without_curriculum(self):
        days = tuple(
            DayContext(date=date(2099, 9, 7) + timedelta(days=i), wake_min=360, sleep_min=1380)
            for i in range(3)
        )
        inputs = EngineInput(
            profile=PlannerPreferences(session_length_preference="MEDIUM"),
            days=days,
            busy_blocks=(),
            demands=(DemandUnit(MATH, DemandActivity.STUDY, 90, None, None),),
        )
        output = generate_plan(inputs, RULES, date(2099, 9, 7))
        self.assertTrue(output.sessions)

    def test_topic_param_appears_in_placement_reason(self):
        days = tuple(
            DayContext(date=date(2099, 9, 7) + timedelta(days=i), wake_min=360, sleep_min=1380)
            for i in range(3)
        )
        inputs = EngineInput(
            profile=PlannerPreferences(session_length_preference="MEDIUM"),
            days=days,
            busy_blocks=(),
            demands=(DemandUnit(MATH, DemandActivity.STUDY, 60, None, None, topic_id="42"),),
            recent_topics={"42": date(2099, 9, 7)},
        )
        output = generate_plan(inputs, RULES, date(2099, 9, 7))
        self.assertTrue(output.sessions)
        params = output.sessions[0].reasons[0].params
        self.assertEqual(params["topic"], "42")
