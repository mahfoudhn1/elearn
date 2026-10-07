"""Import tests: dry-run reporting, idempotency, CSV/JSON and the staff endpoint."""

from decimal import Decimal
from pathlib import Path

from django.core.management import call_command
from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from assessment import factories
from assessment.importers import import_questions, parse_csv
from assessment.management.commands.import_questions import DEFAULT_FIXTURE
from assessment.models import Misconception, Question, QuestionOption


def _mcq(external_id="q-1", **overrides):
    data = {
        "external_id": external_id,
        "kind": "MCQ_SINGLE",
        "prompt_ar": "سؤال",
        "prompt_fr": "Question",
        "difficulty": 3,
        "explanation_ar": "شرح",
        "explanation_fr": "Explanation",
        "status": "DRAFT",
        "options": [
            {"text_ar": "a", "text_fr": "a", "is_correct": True, "order": 1},
            {"text_ar": "b", "text_fr": "b", "is_correct": False, "order": 2},
        ],
    }
    data.update(overrides)
    return data


class ImportFunctionTests(TestCase):
    def setUp(self):
        self.curriculum = factories.make_curriculum()
        self.topic = self.curriculum.topic
        self.author = factories.make_teacher()

    def _document(self, *questions, misconceptions=None):
        for question in questions:
            question.setdefault("topic", str(self.topic.uuid))
            question.setdefault(
                "curriculum_version", str(self.curriculum.curriculum.uuid)
            )
        document = {"questions": list(questions)}
        if misconceptions is not None:
            document["misconceptions"] = misconceptions
        return document

    def test_dry_run_writes_nothing_and_reports(self):
        document = self._document(_mcq())
        report = import_questions(document, author=self.author, dry_run=True)
        self.assertTrue(report.dry_run)
        self.assertEqual(report.created, 1)
        self.assertEqual(report.failed, 0)
        self.assertEqual(Question.objects.count(), 0)

    def test_import_is_idempotent_by_external_id(self):
        document = self._document(_mcq(external_id="stable-1"))
        first = import_questions(document, author=self.author)
        self.assertEqual(first.created, 1)
        question = Question.objects.get(external_id="stable-1")
        self.assertEqual(question.options.count(), 2)

        updated = self._document(
            _mcq(
                external_id="stable-1",
                prompt_fr="Updated",
                options=[
                    {"text_ar": "a", "text_fr": "a", "is_correct": False, "order": 1},
                    {"text_ar": "b", "text_fr": "b", "is_correct": True, "order": 2},
                    {"text_ar": "c", "text_fr": "c", "is_correct": False, "order": 3},
                ],
            )
        )
        second = import_questions(updated, author=self.author)
        self.assertEqual(second.updated, 1)
        self.assertEqual(Question.objects.count(), 1)
        question.refresh_from_db()
        self.assertEqual(question.prompt_fr, "Updated")
        self.assertEqual(question.options.count(), 3)
        correct = question.options.get(is_correct=True)
        self.assertEqual(correct.order, 2)

    def test_unknown_topic_is_reported(self):
        document = self._document(_mcq())
        document["questions"][0]["topic"] = "00000000-0000-0000-0000-00000000dead"
        report = import_questions(document, author=self.author)
        self.assertEqual(report.failed, 1)
        self.assertIn("topic", report.rows[0].errors)
        self.assertEqual(Question.objects.count(), 0)

    def test_published_row_requires_explanation(self):
        document = self._document(
            _mcq(status="PUBLISHED", explanation_ar="", explanation_fr="")
        )
        report = import_questions(document, author=self.author)
        self.assertEqual(report.failed, 1)
        self.assertIn("explanation", report.rows[0].errors)

    def test_draft_row_structure_problems_are_warnings(self):
        document = self._document(
            _mcq(options=[{"text_ar": "only", "text_fr": "only", "is_correct": True, "order": 1}])
        )
        report = import_questions(document, author=self.author)
        self.assertEqual(report.failed, 0)
        self.assertEqual(report.created, 1)
        self.assertIn("options", report.rows[0].warnings)
        self.assertEqual(Question.objects.count(), 1)

    def test_published_row_structure_problem_is_fatal(self):
        document = self._document(
            _mcq(status="PUBLISHED", options=[{"text_ar": "only", "text_fr": "only", "is_correct": True, "order": 1}])
        )
        report = import_questions(document, author=self.author)
        self.assertEqual(report.failed, 1)
        self.assertIn("options", report.rows[0].errors)

    def test_numeric_row_with_spec_imports(self):
        document = self._document(
            {
                "external_id": "num-1",
                "kind": "NUMERIC",
                "difficulty": 2,
                "status": "DRAFT",
                "prompt_fr": "Compute",
                "explanation_fr": "Because",
                "numeric": {"correct_value": "3.14", "tolerance_abs": "0.01"},
                "options": [],
            }
        )
        report = import_questions(document, author=self.author)
        self.assertEqual(report.created, 1, report.as_dict())
        question = Question.objects.get(external_id="num-1")
        self.assertEqual(question.numeric_spec.correct_value, Decimal("3.14"))

    def test_misconceptions_are_created_and_linked(self):
        document = self._document(
            _mcq(
                options=[
                    {"text_ar": "a", "text_fr": "a", "is_correct": True, "order": 1},
                    {
                        "text_ar": "b",
                        "text_fr": "b",
                        "is_correct": False,
                        "order": 2,
                        "misconception_code": "SIGN",
                    },
                ]
            ),
            misconceptions=[
                {
                    "topic": str(self.topic.uuid),
                    "code": "SIGN",
                    "description_ar": "خطأ",
                    "description_fr": "Sign error",
                }
            ],
        )
        report = import_questions(document, author=self.author)
        self.assertEqual(report.created, 1, report.as_dict())
        misconception = Misconception.objects.get(topic=self.topic, code="SIGN")
        option = QuestionOption.objects.get(question__external_id="q-1", is_correct=False)
        self.assertEqual(option.misconception_id, misconception.id)

    def test_csv_import(self):
        text = (
            "external_id,topic,curriculum_version,kind,prompt_ar,prompt_fr,difficulty,"
            "est_seconds,explanation_ar,explanation_fr,status,is_sample,source_note,"
            "option_order,option_text_ar,option_text_fr,option_is_correct,"
            "option_misconception_code,numeric_correct_value,numeric_tolerance_abs,"
            "numeric_tolerance_rel,numeric_accepted_units\n"
            f"csv-1,{self.topic.uuid},{self.curriculum.curriculum.uuid},MCQ_SINGLE,"
            "س,Question,3,,ش,Explanation,DRAFT,false,,1,a,a,true,,,,\n"
            f"csv-1,{self.topic.uuid},{self.curriculum.curriculum.uuid},MCQ_SINGLE,"
            "س,Question,3,,ش,Explanation,DRAFT,false,,2,b,b,false,,,,\n"
        )
        document = parse_csv(text)
        report = import_questions(document, author=self.author)
        self.assertEqual(report.created, 1, report.as_dict())
        question = Question.objects.get(external_id="csv-1")
        self.assertEqual(question.options.count(), 2)


class SampleFixtureTests(TestCase):
    def test_sample_fixture_imports_with_matching_curriculum(self):
        factories.make_curriculum(
            curriculum_uuid=factories.SAMPLE_CURRICULUM_UUID,
            topic_uuid=factories.SAMPLE_TOPIC_UUID,
            label="2099-2100",
        )
        author = factories.make_teacher()
        from assessment.importers import load_document

        document = load_document(DEFAULT_FIXTURE)
        report = import_questions(document, author=author)
        self.assertEqual(report.failed, 0, report.as_dict())
        self.assertEqual(report.created, 3)
        self.assertEqual(Question.objects.filter(is_sample=True).count(), 3)
        self.assertTrue(Question.objects.filter(external_id="sample-numeric-1").exists())


class ImportCommandTests(TestCase):
    def setUp(self):
        self.curriculum = factories.make_curriculum()
        self.topic = self.curriculum.topic
        self.author = factories.make_teacher()
        self.path = Path(DEFAULT_FIXTURE).parent / "questions.sample.json"

    def test_dry_run_command_writes_nothing(self):
        # The sample references fixed uuids; create matching rows first.
        factories.make_curriculum(
            curriculum_uuid=factories.SAMPLE_CURRICULUM_UUID,
            topic_uuid=factories.SAMPLE_TOPIC_UUID,
            label="2099-2101",
        )
        call_command(
            "import_questions",
            path=str(self.path),
            author=str(self.author.uuid),
            dry_run=True,
        )
        self.assertEqual(Question.objects.count(), 0)

    def test_command_errors_on_unknown_author(self):
        from django.core.management.base import CommandError

        with self.assertRaises(CommandError):
            call_command(
                "import_questions",
                path=str(self.path),
                author="00000000-0000-0000-0000-000000000000",
            )


class StaffImportEndpointTests(APITestCase):
    def setUp(self):
        self.curriculum = factories.make_curriculum()
        self.topic = self.curriculum.topic
        self.author = factories.make_teacher()
        self.reviewer = factories.make_staff()
        self.url = reverse("assessment-staff-import")

    def _document(self):
        return {
            "questions": [
                {
                    "external_id": "api-1",
                    "topic": str(self.topic.uuid),
                    "curriculum_version": str(self.curriculum.curriculum.uuid),
                    "kind": "MCQ_SINGLE",
                    "prompt_fr": "Question",
                    "explanation_fr": "Explanation",
                    "difficulty": 3,
                    "status": "DRAFT",
                    "options": [
                        {"text_ar": "a", "text_fr": "a", "is_correct": True, "order": 1},
                        {"text_ar": "b", "text_fr": "b", "is_correct": False, "order": 2},
                    ],
                }
            ]
        }

    def test_non_staff_is_forbidden(self):
        self.client.force_authenticate(self.author.user)
        response = self.client.post(
            self.url,
            {"author": str(self.author.uuid), "document": self._document()},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_dry_run_reports_without_writing(self):
        self.client.force_authenticate(self.reviewer)
        response = self.client.post(
            self.url,
            {
                "author": str(self.author.uuid),
                "dry_run": True,
                "document": self._document(),
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertEqual(response.data["created"], 1)
        self.assertEqual(Question.objects.count(), 0)

    def test_import_creates_questions(self):
        self.client.force_authenticate(self.reviewer)
        response = self.client.post(
            self.url,
            {"author": str(self.author.uuid), "document": self._document()},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertEqual(response.data["created"], 1)
        self.assertEqual(Question.objects.count(), 1)

    def test_csv_file_upload(self):
        from django.core.files.uploadedfile import SimpleUploadedFile

        topic = self.topic.uuid
        curriculum = self.curriculum.curriculum.uuid
        header = (
            "external_id,topic,curriculum_version,kind,prompt_ar,prompt_fr,difficulty,"
            "est_seconds,explanation_ar,explanation_fr,status,is_sample,source_note,"
            "option_order,option_text_ar,option_text_fr,option_is_correct,"
            "option_misconception_code,numeric_correct_value,numeric_tolerance_abs,"
            "numeric_tolerance_rel,numeric_accepted_units\n"
        )
        rows = (
            f"api-csv-1,{topic},{curriculum},MCQ_SINGLE,س,Question,3,,ش,Explanation,"
            "DRAFT,false,,1,a,a,true,,,,\n"
            f"api-csv-1,{topic},{curriculum},MCQ_SINGLE,س,Question,3,,ش,Explanation,"
            "DRAFT,false,,2,b,b,false,,,,\n"
        )
        upload = SimpleUploadedFile(
            "questions.csv", (header + rows).encode("utf-8"), content_type="text/csv"
        )
        self.client.force_authenticate(self.reviewer)
        response = self.client.post(
            self.url,
            {"author": str(self.author.uuid), "file": upload},
            format="multipart",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertEqual(response.data["created"], 1)
        self.assertTrue(Question.objects.filter(external_id="api-csv-1").exists())
