"""Import assessment questions from a JSON or CSV document.

Idempotent via ``external_id``. Use ``--dry-run`` to validate and report row
errors without writing anything.

Example::

    python manage.py import_questions --author <teacher-uuid> --dry-run
    python manage.py import_questions --author <teacher-uuid> \
        --path assessment/fixtures/questions.sample.json
"""

from __future__ import annotations

from pathlib import Path

from django.core.management.base import BaseCommand, CommandError

from assessment.importers import import_questions, load_document
from users.models import Teacher

DEFAULT_FIXTURE = (
    Path(__file__).resolve().parents[2] / "fixtures" / "questions.sample.json"
)


class Command(BaseCommand):
    help = "Bulk import assessment questions (JSON or CSV). Idempotent by external_id."

    def add_arguments(self, parser):
        parser.add_argument("--path", default=str(DEFAULT_FIXTURE))
        parser.add_argument(
            "--author",
            required=True,
            help="Teacher uuid used as the author for rows without an 'author'.",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Validate and report row errors without writing anything.",
        )

    def handle(self, *args, **options):
        path = Path(options["path"])
        if not path.exists():
            raise CommandError(f"Document not found: {path}")

        author = Teacher.objects.filter(uuid=options["author"]).first()
        if author is None:
            raise CommandError(f"Teacher '{options['author']}' not found.")

        try:
            document = load_document(path)
        except ValueError as exc:
            raise CommandError(f"Could not read {path}: {exc}") from exc

        report = import_questions(document, author=author, dry_run=options["dry_run"])

        for row in report.rows:
            if row.errors:
                self.stderr.write(
                    f"  row {row.row} [{row.external_id or '-'}]: {row.errors}"
                )
            elif row.warnings:
                self.stdout.write(
                    self.style.WARNING(
                        f"  row {row.row} [{row.external_id or '-'}] warnings: {row.warnings}"
                    )
                )

        summary = (
            f"created={report.created} updated={report.updated} "
            f"failed={report.failed} dry_run={report.dry_run}"
        )
        if report.failed:
            self.stdout.write(self.style.WARNING(summary))
        else:
            self.stdout.write(self.style.SUCCESS(summary))
