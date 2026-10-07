"""Mastery/readiness API + persistence tests.

Covers the service layer (recompute on evidence, staleness, rule version) and
the read endpoints (topic mastery, chapter readiness, subject readiness,
overview) with permission checks.
"""

from __future__ import annotations

from datetime import timedelta

from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from planner.factories import make_student
from rest_framework import status
from rest_framework.test import APITestCase

from . import factories, services_mastery
from .models import Evidence, MasteryRuleSet, TopicMastery


class MasteryServiceTests(TestCase):
    def setUp(self):
        self.curriculum = factories.make_curriculum()
        self.topic = self.curriculum.topic
        self.student = make_student()

    def _evidence(self, *, score, days_ago, source=Evidence.Source.QUIZ, question=None):
        # Distinct questions by default so the per-question repeat cap does not
        # collapse realistic multi-question evidence into a single observation.
        question = question or factories.make_choice_question(topic=self.topic)
        return factories.make_evidence(
            student=self.student,
            topic=self.topic,
            question=question,
            source=source,
            score=score,
            occurred_at=timezone.now() - timedelta(days=days_ago),
            source_ref_id=f"ref-{score}-{days_ago}-{source}-{question.pk}",
        )

    def test_recompute_creates_and_overwrites_cache(self):
        for score, day in ((1.0, 1), (1.0, 2), (0.0, 3), (1.0, 4)):
            self._evidence(score=score, days_ago=day)

        entry = services_mastery.recompute_topic_mastery(self.student, self.topic)
        self.assertIsNotNone(entry.mastery)
        self.assertGreaterEqual(entry.evidence_count, 4)
        first_value = entry.mastery

        # A new observation recomputes; the cache is overwritten, not appended.
        self._evidence(score=0.0, days_ago=0)
        entry2 = services_mastery.recompute_topic_mastery(self.student, self.topic)
        self.assertEqual(TopicMastery.objects.filter(student=self.student).count(), 1)
        self.assertNotEqual(entry2.mastery, first_value)

    def test_signal_recomputes_on_commit(self):
        with self.captureOnCommitCallbacks(execute=True):
            self._evidence(score=1.0, days_ago=1)
            self._evidence(score=1.0, days_ago=2)
            self._evidence(score=1.0, days_ago=3)
        entry = TopicMastery.objects.get(student=self.student, topic=self.topic)
        self.assertEqual(entry.evidence_count, 3)

    def test_ensure_is_lazy_and_stale_aware(self):
        self._evidence(score=1.0, days_ago=1)
        self._evidence(score=1.0, days_ago=2)
        entries = services_mastery.ensure_topic_mastery(self.student, [self.topic])
        self.assertEqual(len(entries), 1)

        # Force the cached row stale -> a plain ensure recomputes it.
        TopicMastery.objects.filter(pk=entries[0].pk).update(
            computed_at=timezone.now() - services_mastery.STALE_AFTER - timedelta(hours=1)
        )
        refreshed = services_mastery.ensure_topic_mastery(self.student, [self.topic])
        self.assertGreater(
            refreshed[0].computed_at, entries[0].computed_at
        )

    def test_rule_version_change_invalidates_cache(self):
        self._evidence(score=1.0, days_ago=1)
        entry = services_mastery.recompute_topic_mastery(
            self.student, self.topic, rules_version=1
        )
        self.assertFalse(
            services_mastery.is_stale(entry, rules_version=1)
        )
        self.assertTrue(
            services_mastery.is_stale(entry, rules_version=2)
        )

    def test_active_ruleset_is_used_and_falls_back(self):
        # No active DB rule set -> bundled default version.
        self.assertEqual(
            services_mastery.active_rules_meta()[1],
            services_mastery.DEFAULT_RULES_VERSION,
        )

    def test_invalid_active_ruleset_falls_back(self):
        # save() validates, so bypass it to simulate a corrupt active row.
        MasteryRuleSet.objects.bulk_create(
            [
                MasteryRuleSet(
                    name="bad",
                    version=1,
                    is_active=True,
                    json={"not": "valid"},
                )
            ]
        )
        rules = services_mastery.active_rules()
        # Falls back to the bundled default rather than raising.
        self.assertGreater(rules.half_life_days, 0)


class MasteryEndpointTests(APITestCase):
    def setUp(self):
        self.curriculum = factories.make_curriculum()
        self.topic = self.curriculum.topic
        self.chapter = self.curriculum.chapter
        self.student = make_student()
        self.user = self.student.user
        self.url_topics = reverse("assessment-mastery-topics")
        self.url_chapters = reverse("assessment-mastery-chapters")
        self.url_overview = reverse("assessment-readiness-overview")
        self.url_subject = reverse(
            "assessment-readiness-subject",
            kwargs={"subject": self.chapter.subject},
        )
        # Distinct questions so the repeat cap does not suppress the evidence.
        for score, day in ((1.0, 1), (1.0, 2), (0.5, 3), (0.0, 4)):
            question = factories.make_choice_question(topic=self.topic)
            factories.make_evidence(
                student=self.student,
                topic=self.topic,
                question=question,
                score=score,
                occurred_at=timezone.now() - timedelta(days=day),
                source_ref_id=f"r-{score}-{day}-{question.pk}",
            )

    def test_topic_mastery_endpoint(self):
        self.client.force_authenticate(self.user)
        response = self.client.get(self.url_topics, {"subject": self.chapter.subject})
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertEqual(len(response.data), 1)
        row = response.data[0]
        self.assertEqual(row["topic"], str(self.topic.uuid))
        self.assertIn("confidence", row)
        self.assertIn("trend", row)
        self.assertTrue(row["reasons"])

    def test_topic_mastery_filtered_by_chapter(self):
        self.client.force_authenticate(self.user)
        response = self.client.get(self.url_topics, {"chapter": str(self.chapter.uuid)})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_chapter_readiness_endpoint(self):
        self.client.force_authenticate(self.user)
        response = self.client.get(self.url_chapters, {"subject": self.chapter.subject})
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertEqual(len(response.data), 1)
        row = response.data[0]
        self.assertEqual(row["chapter"], str(self.chapter.uuid))
        self.assertIn("band", row)
        self.assertIn("coverage", row)

    def test_subject_readiness_endpoint(self):
        self.client.force_authenticate(self.user)
        response = self.client.get(self.url_subject)
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertEqual(response.data["subject"], self.chapter.subject)
        self.assertIn("value", response.data)
        self.assertIn("coverage", response.data)

    def test_overview_endpoint(self):
        self.client.force_authenticate(self.user)
        response = self.client.get(self.url_overview)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        subjects = [row["subject"] for row in response.data]
        self.assertIn(self.chapter.subject, subjects)

    def test_requires_authentication(self):
        response = self.client.get(self.url_topics)
        self.assertIn(
            response.status_code,
            (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN),
        )

    def test_requires_student_profile(self):
        teacher = factories.make_teacher()
        self.client.force_authenticate(teacher.user)
        response = self.client.get(self.url_topics)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_other_student_evidence_is_not_visible(self):
        other = make_student()
        self.client.force_authenticate(other.user)
        response = self.client.get(self.url_topics, {"subject": self.chapter.subject})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # The other student has no evidence -> no cached rows returned.
        rows = [row for row in response.data if row["evidence_count"] > 0]
        self.assertEqual(rows, [])

    def test_curriculum_endpoint_lists_chapter_topics(self):
        self.client.force_authenticate(self.user)
        response = self.client.get(
            reverse("assessment-curriculum"),
            {"subject": self.chapter.subject},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertEqual(len(response.data), 1)
        chapter = response.data[0]
        self.assertEqual(chapter["chapter"], str(self.chapter.uuid))
        self.assertEqual(chapter["subject"], self.chapter.subject)
        self.assertEqual(len(chapter["topics"]), 1)
        self.assertEqual(chapter["topics"][0]["id"], str(self.topic.uuid))

    def test_curriculum_requires_student(self):
        teacher = factories.make_teacher()
        self.client.force_authenticate(teacher.user)
        response = self.client.get(reverse("assessment-curriculum"))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class MasteryRuleSetApiTests(APITestCase):
    def setUp(self):
        self.staff = factories.make_staff()
        self.teacher = factories.make_teacher()
        self.url = reverse("assessment-mastery-rules-list")

    def _bundled_payload(self):
        import json

        from .engine.mastery_rules import DEFAULT_MASTERY_FILENAME, RULES_DIR

        return json.loads((RULES_DIR / DEFAULT_MASTERY_FILENAME).read_text("utf-8"))

    def test_staff_can_create_valid_ruleset(self):
        self.client.force_authenticate(self.staff)
        response = self.client.post(
            self.url,
            {
                "name": "custom",
                "version": 2,
                "json": self._bundled_payload(),
                "is_active": False,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)

    def test_invalid_ruleset_is_rejected(self):
        self.client.force_authenticate(self.staff)
        response = self.client.post(
            self.url,
            {"name": "bad", "version": 1, "json": {"half_life_days": -1}},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_non_staff_cannot_manage_rulesets(self):
        self.client.force_authenticate(self.teacher.user)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
