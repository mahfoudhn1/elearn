"""API tests: permissions, workflow transitions and student-safe output."""

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from . import factories
from .models import Question


class QuestionApiTestCase(APITestCase):
    def setUp(self):
        self.curriculum = factories.make_curriculum()
        self.topic = self.curriculum.topic
        self.author_teacher = factories.make_teacher()
        self.author = self.author_teacher.user
        self.other_teacher = factories.make_teacher()
        self.other = self.other_teacher.user
        self.reviewer = factories.make_staff()
        self.student = factories.make_user(role="student")

    def payload(self, **overrides):
        data = {
            "topic": str(self.topic.uuid),
            "curriculum_version": str(self.curriculum.curriculum.uuid),
            "kind": "MCQ_SINGLE",
            "prompt_ar": "سؤال",
            "prompt_fr": "Question",
            "difficulty": 3,
            "explanation_ar": "شرح",
            "explanation_fr": "Explanation",
            "options": [
                {"text_ar": "a", "text_fr": "a", "is_correct": True, "order": 1},
                {"text_ar": "b", "text_fr": "b", "is_correct": False, "order": 2},
            ],
        }
        data.update(overrides)
        return data


class PermissionTests(QuestionApiTestCase):
    def test_unauthenticated_is_rejected(self):
        response = self.client.get(reverse("assessment-question-list"))
        self.assertIn(
            response.status_code,
            (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN),
        )

    def test_student_cannot_create(self):
        self.client.force_authenticate(self.student)
        response = self.client.post(
            reverse("assessment-question-list"), self.payload(), format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_teacher_creates_draft_and_author_is_assigned(self):
        self.client.force_authenticate(self.author)
        response = self.client.post(
            reverse("assessment-question-list"), self.payload(), format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        question = Question.objects.get(uuid=response.data["id"])
        self.assertEqual(question.status, Question.Status.DRAFT)
        self.assertEqual(question.author_id, self.author_teacher.id)
        self.assertEqual(question.options.count(), 2)

    def test_other_teacher_cannot_see_or_edit_a_draft(self):
        draft = factories.make_choice_question(
            topic=self.topic, author=self.author_teacher
        )
        self.client.force_authenticate(self.other)
        detail = reverse("assessment-question-detail", kwargs={"pk": draft.uuid})
        self.assertEqual(self.client.get(detail).status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(
            self.client.patch(detail, {"difficulty": 5}, format="json").status_code,
            status.HTTP_404_NOT_FOUND,
        )

    def test_author_can_edit_own_draft(self):
        draft = factories.make_choice_question(
            topic=self.topic, author=self.author_teacher
        )
        self.client.force_authenticate(self.author)
        detail = reverse("assessment-question-detail", kwargs={"pk": draft.uuid})
        response = self.client.patch(detail, {"difficulty": 5}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        draft.refresh_from_db()
        self.assertEqual(draft.difficulty, 5)

    def test_author_cannot_edit_published(self):
        published = factories.make_choice_question(
            topic=self.topic,
            author=self.author_teacher,
            status=Question.Status.PUBLISHED,
        )
        self.client.force_authenticate(self.author)
        response = self.client.patch(
            reverse("assessment-question-detail", kwargs={"pk": published.uuid}),
            {"difficulty": 5},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_create_rejects_curriculum_topic_mismatch(self):
        other = factories.make_curriculum()
        self.client.force_authenticate(self.author)
        response = self.client.post(
            reverse("assessment-question-list"),
            self.payload(curriculum_version=str(other.curriculum.uuid)),
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("curriculum_version", response.data)

    def test_numeric_spec_rejected_on_choice_question(self):
        self.client.force_authenticate(self.author)
        response = self.client.post(
            reverse("assessment-question-list"),
            self.payload(
                kind="MCQ_SINGLE",
                numeric_spec={"correct_value": "1.0"},
            ),
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("numeric_spec", response.data)

    def test_external_id_must_be_unique(self):
        self.client.force_authenticate(self.author)
        first = self.client.post(
            reverse("assessment-question-list"),
            self.payload(external_id="dup-1"),
            format="json",
        )
        self.assertEqual(first.status_code, status.HTTP_201_CREATED)
        second = self.client.post(
            reverse("assessment-question-list"),
            self.payload(external_id="dup-1"),
            format="json",
        )
        self.assertEqual(second.status_code, status.HTTP_400_BAD_REQUEST)


class StudentReadTests(QuestionApiTestCase):
    def setUp(self):
        super().setUp()
        self.published = factories.make_choice_question(
            topic=self.topic,
            author=self.author_teacher,
            status=Question.Status.PUBLISHED,
            correct_index=0,
        )
        self.draft = factories.make_choice_question(
            topic=self.topic, author=self.author_teacher
        )
        self.client.force_authenticate(self.student)

    def test_student_only_sees_published(self):
        response = self.client.get(reverse("assessment-question-list"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ids = [row["id"] for row in response.data]
        self.assertEqual(ids, [str(self.published.uuid)])

    def test_student_cannot_retrieve_draft(self):
        response = self.client.get(
            reverse("assessment-question-detail", kwargs={"pk": self.draft.uuid})
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_student_never_sees_correct_flags(self):
        response = self.client.get(
            reverse(
                "assessment-question-detail", kwargs={"pk": self.published.uuid}
            )
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        for option in response.data["options"]:
            self.assertNotIn("is_correct", option)
            self.assertNotIn("misconception", option)

    def test_student_cannot_write(self):
        detail = reverse(
            "assessment-question-detail", kwargs={"pk": self.published.uuid}
        )
        self.assertEqual(
            self.client.post(
                reverse("assessment-question-list"), self.payload(), format="json"
            ).status_code,
            status.HTTP_403_FORBIDDEN,
        )
        self.assertEqual(
            self.client.patch(detail, {"difficulty": 1}, format="json").status_code,
            status.HTTP_403_FORBIDDEN,
        )
        self.assertEqual(self.client.delete(detail).status_code, status.HTTP_403_FORBIDDEN)

    def test_teacher_sees_correct_flags(self):
        self.client.force_authenticate(self.author)
        response = self.client.get(
            reverse(
                "assessment-question-detail", kwargs={"pk": self.published.uuid}
            )
        )
        self.assertIn("is_correct", response.data["options"][0])


class WorkflowApiTests(QuestionApiTestCase):
    def setUp(self):
        super().setUp()
        self.question = factories.make_choice_question(
            topic=self.topic, author=self.author_teacher
        )
        self.detail = reverse(
            "assessment-question-detail", kwargs={"pk": self.question.uuid}
        )

    def _action_url(self, name):
        return reverse(f"assessment-question-{name}", kwargs={"pk": self.question.uuid})

    def test_author_submits_for_review(self):
        self.client.force_authenticate(self.author)
        response = self.client.post(self._action_url("submit-for-review"))
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.question.refresh_from_db()
        self.assertEqual(self.question.status, Question.Status.IN_REVIEW)

    def test_non_author_teacher_cannot_submit(self):
        self.client.force_authenticate(self.reviewer)
        response = self.client.post(self._action_url("submit-for-review"))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_non_staff_cannot_publish(self):
        self.question.submit_for_review()
        self.client.force_authenticate(self.author)
        response = self.client.post(self._action_url("publish"), {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_reviewer_publishes(self):
        self.question.submit_for_review()
        self.client.force_authenticate(self.reviewer)
        response = self.client.post(
            self._action_url("publish"), {"comment": "ok"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.question.refresh_from_db()
        self.assertEqual(self.question.status, Question.Status.PUBLISHED)
        self.assertEqual(self.question.reviewer_id, self.reviewer.id)

    def test_publish_before_submit_is_rejected(self):
        self.client.force_authenticate(self.reviewer)
        response = self.client.post(self._action_url("publish"), {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_reviewer_rejects_with_comment(self):
        self.question.submit_for_review()
        self.client.force_authenticate(self.reviewer)
        response = self.client.post(
            self._action_url("reject"), {"comment": "Needs a better distractor"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.question.refresh_from_db()
        self.assertEqual(self.question.status, Question.Status.DRAFT)
        self.assertEqual(self.question.review_comment, "Needs a better distractor")

    def test_reject_requires_comment(self):
        self.question.submit_for_review()
        self.client.force_authenticate(self.reviewer)
        response = self.client.post(self._action_url("reject"), {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_publish_rejects_missing_explanation(self):
        question = factories.make_choice_question(
            topic=self.topic,
            author=self.author_teacher,
            explanation_ar="",
            explanation_fr="",
        )
        question.submit_for_review()
        self.client.force_authenticate(self.reviewer)
        response = self.client.post(
            reverse("assessment-question-publish", kwargs={"pk": question.uuid}),
            {},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("explanation", response.data)

    def test_reviewer_retires_published(self):
        self.question.submit_for_review()
        self.question.publish(self.reviewer)
        self.client.force_authenticate(self.reviewer)
        response = self.client.post(self._action_url("retire"), {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.question.refresh_from_db()
        self.assertEqual(self.question.status, Question.Status.RETIRED)


class FilterTests(QuestionApiTestCase):
    def setUp(self):
        super().setUp()
        self.client.force_authenticate(self.author)
        factories.make_choice_question(
            topic=self.topic,
            author=self.author_teacher,
            status=Question.Status.PUBLISHED,
            kind=Question.Kind.MCQ_SINGLE,
        )
        factories.make_question(
            topic=self.topic,
            author=self.author_teacher,
            kind=Question.Kind.NUMERIC,
        )

    def test_filter_by_kind(self):
        response = self.client.get(
            reverse("assessment-question-list"), {"kind": Question.Kind.NUMERIC}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["kind"], Question.Kind.NUMERIC)

    def test_filter_by_topic(self):
        response = self.client.get(
            reverse("assessment-question-list"), {"topic": str(self.topic.uuid)}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)
