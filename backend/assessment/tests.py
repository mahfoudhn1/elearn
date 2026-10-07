"""Validation and workflow unit tests for assessment content."""

from django.core.exceptions import ValidationError
from django.test import TestCase

from . import factories
from .models import NumericAnswerSpec, Question


class StructureValidationTests(TestCase):
    def setUp(self):
        self.curriculum = factories.make_curriculum()
        self.topic = self.curriculum.topic

    def test_mcq_single_requires_exactly_one_correct(self):
        factories.make_choice_question(topic=self.topic, correct_index=1).validate_structure()

        none_correct = factories.make_choice_question(topic=self.topic, correct_index=-1)
        with self.assertRaises(ValidationError) as ctx:
            none_correct.validate_structure()
        self.assertIn("options", ctx.exception.message_dict)

        two_correct = factories.make_question(topic=self.topic)
        factories.make_option(question=two_correct, is_correct=True, order=1)
        factories.make_option(question=two_correct, is_correct=True, order=2)
        with self.assertRaises(ValidationError):
            two_correct.validate_structure()

    def test_mcq_multi_requires_at_least_one_correct(self):
        multi = factories.make_question(topic=self.topic, kind=Question.Kind.MCQ_MULTI)
        factories.make_option(question=multi, is_correct=True, order=1)
        factories.make_option(question=multi, is_correct=True, order=2)
        factories.make_option(question=multi, order=3)
        multi.validate_structure()

        none = factories.make_question(topic=self.topic, kind=Question.Kind.MCQ_MULTI)
        factories.make_option(question=none, order=1)
        factories.make_option(question=none, order=2)
        with self.assertRaises(ValidationError):
            none.validate_structure()

    def test_mcq_needs_at_least_two_options(self):
        single = factories.make_question(topic=self.topic)
        factories.make_option(question=single, is_correct=True, order=1)
        with self.assertRaises(ValidationError):
            single.validate_structure()

    def test_true_false_requires_exactly_two_options(self):
        good = factories.make_question(topic=self.topic, kind=Question.Kind.TRUE_FALSE)
        factories.make_option(question=good, text="True", is_correct=True, order=1)
        factories.make_option(question=good, text="False", order=2)
        good.validate_structure()

        three = factories.make_question(topic=self.topic, kind=Question.Kind.TRUE_FALSE)
        factories.make_option(question=three, is_correct=True, order=1)
        factories.make_option(question=three, order=2)
        factories.make_option(question=three, order=3)
        with self.assertRaises(ValidationError):
            three.validate_structure()

        two_correct = factories.make_question(
            topic=self.topic, kind=Question.Kind.TRUE_FALSE
        )
        factories.make_option(question=two_correct, is_correct=True, order=1)
        factories.make_option(question=two_correct, is_correct=True, order=2)
        with self.assertRaises(ValidationError):
            two_correct.validate_structure()

    def test_numeric_requires_spec_and_forbids_options(self):
        numeric = factories.make_question(topic=self.topic, kind=Question.Kind.NUMERIC)
        with self.assertRaises(ValidationError) as ctx:
            numeric.validate_structure()
        self.assertIn("numeric_spec", ctx.exception.message_dict)

        NumericAnswerSpec.objects.create(question=numeric, correct_value="1.5")
        numeric.validate_structure()

        factories.make_option(question=numeric, is_correct=True, order=1)
        with self.assertRaises(ValidationError):
            numeric.validate_structure()


class PublishableValidationTests(TestCase):
    def setUp(self):
        self.curriculum = factories.make_curriculum()
        self.topic = self.curriculum.topic

    def test_requires_prompt_in_one_language(self):
        question = factories.make_choice_question(
            topic=self.topic, prompt_ar="", prompt_fr=""
        )
        with self.assertRaises(ValidationError) as ctx:
            question.validate_publishable()
        self.assertIn("prompt", ctx.exception.message_dict)

    def test_requires_explanation_in_one_language(self):
        question = factories.make_choice_question(
            topic=self.topic, explanation_ar="", explanation_fr=""
        )
        with self.assertRaises(ValidationError) as ctx:
            question.validate_publishable()
        self.assertIn("explanation", ctx.exception.message_dict)

    def test_one_language_is_enough(self):
        question = factories.make_choice_question(
            topic=self.topic, prompt_ar="", prompt_fr="Only French"
        )
        question.validate_publishable()


class WorkflowTests(TestCase):
    def setUp(self):
        self.curriculum = factories.make_curriculum()
        self.topic = self.curriculum.topic
        self.author_user = factories.make_user()
        self.author = factories.make_teacher(user=self.author_user)
        self.reviewer = factories.make_staff()
        self.question = factories.make_choice_question(
            topic=self.topic, author=self.author
        )

    def test_submit_requires_draft(self):
        self.question.submit_for_review()
        self.question.refresh_from_db()
        self.assertEqual(self.question.status, Question.Status.IN_REVIEW)
        with self.assertRaises(ValidationError):
            self.question.submit_for_review()

    def test_submit_rejects_invalid_structure(self):
        bad = factories.make_choice_question(
            topic=self.topic, author=self.author, correct_index=-1
        )
        with self.assertRaises(ValidationError):
            bad.submit_for_review()
        bad.refresh_from_db()
        self.assertEqual(bad.status, Question.Status.DRAFT)

    def test_publish_sets_reviewer_and_timestamp(self):
        self.question.submit_for_review()
        self.question.publish(self.reviewer, comment="Looks good")
        self.question.refresh_from_db()
        self.assertEqual(self.question.status, Question.Status.PUBLISHED)
        self.assertEqual(self.question.reviewer_id, self.reviewer.id)
        self.assertIsNotNone(self.question.reviewed_at)

    def test_publish_rejects_missing_explanation(self):
        question = factories.make_choice_question(
            topic=self.topic, author=self.author, explanation_ar="", explanation_fr=""
        )
        question.submit_for_review()
        with self.assertRaises(ValidationError) as ctx:
            question.publish(self.reviewer)
        self.assertIn("explanation", ctx.exception.message_dict)

    def test_reject_requires_comment_and_returns_to_draft(self):
        self.question.submit_for_review()
        with self.assertRaises(ValidationError):
            self.question.reject(self.reviewer, comment="  ")
        self.question.reject(self.reviewer, comment="Needs work")
        self.question.refresh_from_db()
        self.assertEqual(self.question.status, Question.Status.DRAFT)
        self.assertEqual(self.question.review_comment, "Needs work")

    def test_retire_requires_published(self):
        with self.assertRaises(ValidationError):
            self.question.retire(self.reviewer)
        self.question.submit_for_review()
        self.question.publish(self.reviewer)
        self.question.retire(self.reviewer, comment="Outdated")
        self.question.refresh_from_db()
        self.assertEqual(self.question.status, Question.Status.RETIRED)
