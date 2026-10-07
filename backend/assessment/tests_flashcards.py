"""Flashcard API + persistence tests.

Covers the service layer (Leitner transitions, due ordering, offline replay
idempotency, per-day new-card limit, evidence creation) and the endpoints
(due/stats/review + authoring permissions).
"""

from __future__ import annotations

import json
from datetime import timedelta

from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from planner.factories import make_student
from rest_framework import status
from rest_framework.test import APITestCase

from . import factories, services_flashcards
from .engine.leitner_rules import Rating
from .models import Evidence, Flashcard, FlashcardReview, FlashcardState


class FlashcardServiceTests(TestCase):
    def setUp(self):
        self.curriculum = factories.make_curriculum()
        self.topic = self.curriculum.topic
        self.student = make_student()
        self.author = factories.make_teacher()
        self.card = factories.make_flashcard(
            topic=self.topic, author=self.author, status=Flashcard.Status.PUBLISHED
        )

    def test_review_creates_state_and_evidence(self):
        review, state, replay = services_flashcards.record_review(
            self.student, self.card, Rating.GOOD
        )
        self.assertFalse(replay)
        self.assertEqual(state.box, 2)
        self.assertEqual(state.streak, 1)
        self.assertEqual(FlashcardState.objects.count(), 1)
        evidence = Evidence.objects.get(source=Evidence.Source.FLASHCARD)
        self.assertEqual(evidence.topic_id, self.topic.id)
        self.assertEqual(evidence.question_id, None)

    def test_again_resets_and_lapses(self):
        services_flashcards.record_review(self.student, self.card, Rating.EASY)
        _review, state, _ = services_flashcards.record_review(
            self.student, self.card, Rating.AGAIN
        )
        self.assertEqual(state.box, 1)
        self.assertEqual(state.lapses, 1)

    def test_offline_replay_is_idempotent(self):
        first, state1, replay1 = services_flashcards.record_review(
            self.student, self.card, Rating.GOOD, client_review_id="abc-1"
        )
        second, state2, replay2 = services_flashcards.record_review(
            self.student, self.card, Rating.GOOD, client_review_id="abc-1"
        )
        self.assertFalse(replay1)
        self.assertTrue(replay2)
        self.assertEqual(first.pk, second.pk)
        self.assertEqual(FlashcardReview.objects.count(), 1)
        self.assertEqual(Evidence.objects.count(), 1)
        self.assertEqual(state1.box, state2.box)

    def test_replay_with_different_rating_is_rejected(self):
        services_flashcards.record_review(
            self.student, self.card, Rating.GOOD, client_review_id="dup"
        )
        with self.assertRaises(services_flashcards.FlashcardError):
            services_flashcards.record_review(
                self.student, self.card, Rating.EASY, client_review_id="dup"
            )

    def test_unknown_rating_is_rejected(self):
        with self.assertRaises(services_flashcards.FlashcardError):
            services_flashcards.record_review(self.student, self.card, "NOPE")

    def test_due_cards_order_most_overdue_then_topic_then_id(self):
        now = timezone.now()
        # Two cards overdue by different amounts + one new.
        old = factories.make_flashcard(
            topic=self.topic, author=self.author, status=Flashcard.Status.PUBLISHED
        )
        recent = factories.make_flashcard(
            topic=self.topic, author=self.author, status=Flashcard.Status.PUBLISHED
        )
        factories.make_flashcard_state(
            student=self.student, card=old, due_at=now - timedelta(days=10)
        )
        factories.make_flashcard_state(
            student=self.student, card=recent, due_at=now - timedelta(days=1)
        )
        new_cards, review_cards = services_flashcards.due_cards(self.student, now=now)
        self.assertEqual([c.id for c in review_cards], [old.id, recent.id])
        self.assertIn(self.card.id, [c.id for c in new_cards])

    def test_not_yet_due_cards_are_excluded(self):
        now = timezone.now()
        factories.make_flashcard_state(
            student=self.student, card=self.card, due_at=now + timedelta(days=3)
        )
        new_cards, review_cards = services_flashcards.due_cards(self.student, now=now)
        self.assertEqual(review_cards, [])
        self.assertNotIn(self.card.id, [c.id for c in new_cards])

    def test_daily_new_card_limit(self):
        now = timezone.now()
        rules = services_flashcards.active_rules()
        # More new cards than the daily allowance.
        for _ in range(rules.new_cards_per_day + 5):
            factories.make_flashcard(
                topic=self.topic, author=self.author, status=Flashcard.Status.PUBLISHED
            )
        new_cards, _review = services_flashcards.due_cards(self.student, now=now)
        self.assertEqual(len(new_cards), rules.new_cards_per_day)

    def test_new_seen_today_reduces_allowance(self):
        now = timezone.now()
        rules = services_flashcards.active_rules()
        # Review one brand-new card today using the service.
        services_flashcards.record_review(
            self.student, self.card, Rating.GOOD, reviewed_at=now
        )
        self.assertEqual(services_flashcards.new_cards_seen_today(self.student, now), 1)
        # A second card's turn tomorrow resets the allowance.
        tomorrow = now + timedelta(days=1)
        self.assertEqual(
            services_flashcards.new_cards_seen_today(self.student, tomorrow), 0
        )
        self.assertLessEqual(1, rules.new_cards_per_day)

    def test_stats(self):
        services_flashcards.record_review(self.student, self.card, Rating.GOOD)
        data = services_flashcards.stats(self.student)
        self.assertEqual(data["reviews_total"], 1)
        self.assertEqual(data["reviewed_cards"], 1)
        self.assertIn("box_counts", data)


class FlashcardReviewApiTests(APITestCase):
    def setUp(self):
        self.curriculum = factories.make_curriculum()
        self.topic = self.curriculum.topic
        self.student = make_student()
        self.user = self.student.user
        self.author = factories.make_teacher()
        self.card = factories.make_flashcard(
            topic=self.topic, author=self.author, status=Flashcard.Status.PUBLISHED
        )

    def _review(self, card=None, **payload):
        self.client.force_authenticate(self.user)
        return self.client.post(
            reverse("assessment-flashcard-review", kwargs={"pk": (card or self.card).uuid}),
            payload,
            format="json",
        )

    def test_review_endpoint(self):
        response = self._review(rating="GOOD", client_review_id="r1")
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertEqual(response.data["box"], 2)
        self.assertFalse(response.data["replay"])

    def test_review_replay_marks_replay(self):
        self._review(rating="GOOD", client_review_id="r1")
        second = self._review(rating="GOOD", client_review_id="r1")
        self.assertTrue(second.data["replay"])
        self.assertEqual(FlashcardReview.objects.count(), 1)

    def test_review_invalid_rating(self):
        response = self._review(rating="NOPE")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_review_unpublished_card_is_404(self):
        draft = factories.make_flashcard(
            topic=self.topic, author=self.author, status=Flashcard.Status.DRAFT
        )
        response = self._review(card=draft, rating="GOOD")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_review_requires_auth(self):
        response = self.client.post(
            reverse("assessment-flashcard-review", kwargs={"pk": self.card.uuid}),
            {"rating": "GOOD"},
            format="json",
        )
        self.assertIn(
            response.status_code,
            (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN),
        )

    def test_due_and_stats_endpoints(self):
        self.client.force_authenticate(self.user)
        due = self.client.get(reverse("assessment-flashcards-due"))
        self.assertEqual(due.status_code, status.HTTP_200_OK, due.data)
        self.assertEqual(due.data["new_count"], 1)
        stats = self.client.get(reverse("assessment-flashcards-stats"))
        self.assertEqual(stats.status_code, status.HTTP_200_OK)
        self.assertEqual(stats.data["reviews_total"], 0)

    def test_due_limit_validation(self):
        self.client.force_authenticate(self.user)
        bad = self.client.get(reverse("assessment-flashcards-due"), {"limit": "abc"})
        self.assertEqual(bad.status_code, status.HTTP_400_BAD_REQUEST)

    def test_due_topic_filter(self):
        other_chapter = self.curriculum.chapter  # same topic tree
        other_topic = factories.make_curriculum().topic
        factories.make_flashcard(
            topic=other_topic, author=self.author, status=Flashcard.Status.PUBLISHED
        )
        self.client.force_authenticate(self.user)
        response = self.client.get(
            reverse("assessment-flashcards-due"), {"topic": str(self.topic.uuid)}
        )
        self.assertEqual(len(response.data["cards"]), 1)
        self.assertEqual(other_chapter.subject, self.topic.chapter.subject)


class FlashcardAuthoringApiTests(APITestCase):
    def setUp(self):
        self.curriculum = factories.make_curriculum()
        self.topic = self.curriculum.topic
        self.author = factories.make_teacher()
        self.staff = factories.make_staff()
        self.student = make_student()
        self.list_url = reverse("assessment-flashcard-list")

    def _create(self, user, **overrides):
        self.client.force_authenticate(user)
        payload = {
            "topic": str(self.topic.uuid),
            "curriculum_version": str(self.curriculum.curriculum.uuid),
            "front_fr": "front",
            "back_fr": "back",
            "difficulty": 3,
        }
        payload.update(overrides)
        return self.client.post(self.list_url, payload, format="json")

    def test_teacher_can_create_and_submit(self):
        response = self._create(self.author.user)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertEqual(response.data["status"], Flashcard.Status.DRAFT)
        card_id = response.data["id"]
        submitted = self.client.post(
            reverse("assessment-flashcard-submit-for-review", kwargs={"pk": card_id})
        )
        self.assertEqual(submitted.status_code, status.HTTP_200_OK, submitted.data)
        self.assertEqual(submitted.data["status"], Flashcard.Status.IN_REVIEW)

    def test_student_cannot_create(self):
        response = self._create(self.student.user)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_staff_publishes(self):
        created = self._create(self.author.user)
        card_id = created.data["id"]
        self.client.post(
            reverse("assessment-flashcard-submit-for-review", kwargs={"pk": card_id})
        )
        self.client.force_authenticate(self.staff)
        published = self.client.post(
            reverse("assessment-flashcard-publish", kwargs={"pk": card_id})
        )
        self.assertEqual(published.status_code, status.HTTP_200_OK, published.data)
        self.assertEqual(published.data["status"], Flashcard.Status.PUBLISHED)

    def test_student_sees_only_published(self):
        draft = factories.make_flashcard(
            topic=self.topic, author=self.author, status=Flashcard.Status.DRAFT
        )
        published = factories.make_flashcard(
            topic=self.topic, author=self.author, status=Flashcard.Status.PUBLISHED
        )
        self.client.force_authenticate(self.student.user)
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        rows = response.data.get("results", response.data) if hasattr(
            response.data, "get"
        ) else response.data
        ids = {row["id"] for row in rows}
        self.assertIn(str(published.uuid), ids)
        self.assertNotIn(str(draft.uuid), ids)

    def test_curriculum_mismatch_rejected(self):
        other = factories.make_curriculum()
        response = self._create(
            self.author.user, curriculum_version=str(other.curriculum.uuid)
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class FlashcardsRuleSetApiTests(APITestCase):
    def setUp(self):
        self.staff = factories.make_staff()
        self.teacher = factories.make_teacher()
        self.url = reverse("assessment-flashcard-rules-list")

    def _bundled_payload(self):
        from .engine.leitner_rules import DEFAULT_LEITNER_FILENAME, RULES_DIR

        return json.loads((RULES_DIR / DEFAULT_LEITNER_FILENAME).read_text("utf-8"))

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

    def test_invalid_ruleset_rejected(self):
        self.client.force_authenticate(self.staff)
        response = self.client.post(
            self.url,
            {"name": "bad", "version": 1, "json": {"max_box": -1}},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_non_staff_forbidden(self):
        self.client.force_authenticate(self.teacher.user)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
