"""Import a curriculum from JSON (nested) or CSV (flat rows).

The bundled fixture is a tiny FAKE sample (``verified=false``); real Algerian
program content must never be invented here. Import is idempotent.

JSON shape::

    {"academic_year": "2099-2100", "level": "...", "stream": "...",
     "status": "DRAFT", "verified": false, "source_note": "...",
     "chapters": [{"subject": "...", "order": 1, "title_ar": "...",
                   "title_fr": "...", "weight": 4,
                    "topics": [{"order": 1, "trimester": 1, "title_ar": "...",
                                "title_fr": "...", "title_en": "...",
                                "estimated_minutes": 60, "is_published": false,
                                "objectives": [{"text_ar": "...", "text_fr": "..."}]}]}

CSV columns: subject,chapter_order,chapter_title_ar,chapter_title_fr,chapter_weight,
topic_order,topic_title_ar,topic_title_fr
"""

from __future__ import annotations

import csv
import json
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError

from planner.models import AcademicYear, Chapter, CurriculumVersion, LearningObjective, Topic

DEFAULT_FIXTURE = Path(__file__).resolve().parents[2] / "fixtures" / "curriculum.sample.json"

#: Clearly fake dates used only when --create-year has to invent a placeholder.
PLACEHOLDER_YEAR_START = "2099-09-01"
PLACEHOLDER_YEAR_END = "2100-06-30"


class Command(BaseCommand):
    help = "Import a curriculum (JSON or CSV). Placeholder data only."

    def add_arguments(self, parser):
        parser.add_argument("--path", default=str(DEFAULT_FIXTURE))
        parser.add_argument(
            "--create-year",
            action="store_true",
            help="Create the referenced academic year if it is missing (placeholder dates).",
        )

    def handle(self, *args, **options):
        path = Path(options["path"])
        if not path.exists():
            raise CommandError(f"Fixture not found: {path}")

        if path.suffix.lower() == ".csv":
            payload = self._read_csv(path)
        else:
            payload = self._read_json(path)

        year = self._resolve_year(payload["academic_year"], options["create_year"])
        curriculum, _ = CurriculumVersion.objects.update_or_create(
            academic_year=year,
            level=payload.get("level", ""),
            stream=payload.get("stream", ""),
            defaults={
                "status": payload.get("status", CurriculumVersion.Status.DRAFT),
                "verified": payload.get("verified", False),
                "source_note": payload.get("source_note", ""),
            },
        )
        chapters, topics, objectives = self._seed_chapters(curriculum, payload.get("chapters", []))
        self.stdout.write(
            self.style.SUCCESS(
                f"Curriculum '{curriculum}' imported: {chapters} chapter(s), "
                f"{topics} topic(s), {objectives} objective(s)."
            )
        )
        self.stdout.write(
            self.style.WARNING(
                "Placeholder curriculum. Verify content and update docs/TO_VERIFY.md."
            )
        )

    def _read_json(self, path: Path) -> dict:
        try:
            return json.loads(path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as exc:
            raise CommandError(f"Invalid JSON in {path}: {exc}") from exc

    def _read_csv(self, path: Path) -> dict:
        chapters: dict[tuple, dict] = {}
        with path.open(encoding="utf-8") as handle:
            for row in csv.DictReader(handle):
                chapter_key = (row["subject"], int(row["chapter_order"]))
                chapter = chapters.setdefault(
                    chapter_key,
                    {
                        "subject": row["subject"],
                        "order": int(row["chapter_order"]),
                        "title_ar": row.get("chapter_title_ar", ""),
                        "title_fr": row.get("chapter_title_fr", ""),
                        "weight": row.get("chapter_weight") or 0,
                        "topics": [],
                    },
                )
                chapter["topics"].append(
                    {
                        "order": int(row["topic_order"]),
                        "trimester": int(row.get("trimester") or 1),
                        "title_ar": row.get("topic_title_ar", ""),
                        "title_fr": row.get("topic_title_fr", ""),
                        "title_en": row.get("topic_title_en", ""),
                        "estimated_minutes": int(row.get("estimated_minutes") or 60),
                        "is_published": str(row.get("is_published", "false")).lower() in {"1", "true", "yes"},
                        "objectives": [],
                    }
                )
        # CSV carries no year/scope; caller supplies --path with a JSON sibling.
        return {
            "academic_year": "2099-2100",
            "level": "",
            "stream": "",
            "status": CurriculumVersion.Status.DRAFT,
            "verified": False,
            "chapters": list(chapters.values()),
        }

    def _resolve_year(self, label: str, create: bool) -> AcademicYear:
        year = AcademicYear.objects.filter(label=label).first()
        if year is not None:
            return year
        if not create:
            raise CommandError(
                f"Academic year '{label}' does not exist. Run seed_academic_calendar or pass --create-year."
            )
        from django.utils.dateparse import parse_date

        return AcademicYear.objects.create(
            label=label,
            start_date=parse_date(PLACEHOLDER_YEAR_START),
            end_date=parse_date(PLACEHOLDER_YEAR_END),
        )

    def _seed_chapters(self, curriculum, chapters):
        chapter_count = topic_count = objective_count = 0
        for chapter_data in chapters:
            chapter, _ = Chapter.objects.update_or_create(
                curriculum=curriculum,
                subject=chapter_data["subject"],
                order=chapter_data["order"],
                defaults={
                    "title_ar": chapter_data.get("title_ar", ""),
                    "title_fr": chapter_data.get("title_fr", ""),
                    "weight": chapter_data.get("weight") or 0,
                },
            )
            chapter_count += 1
            for topic_data in chapter_data.get("topics", []):
                topic, _ = Topic.objects.update_or_create(
                    chapter=chapter,
                    order=topic_data["order"],
                    defaults={
                        "trimester": topic_data.get("trimester", 1),
                        "title_ar": topic_data.get("title_ar", ""),
                        "title_fr": topic_data.get("title_fr", ""),
                        "title_en": topic_data.get("title_en", ""),
                        "estimated_minutes": topic_data.get("estimated_minutes", 60),
                        "is_published": topic_data.get("is_published", False),
                    },
                )
                topic_count += 1
                objective_count += self._seed_objectives(topic, topic_data.get("objectives", []))
        return chapter_count, topic_count, objective_count

    def _seed_objectives(self, topic, objectives):
        topic.objectives.all().delete()
        created = 0
        for index, objective in enumerate(objectives, start=1):
            LearningObjective.objects.create(
                topic=topic,
                order=objective.get("order", index),
                text_ar=objective.get("text_ar", ""),
                text_fr=objective.get("text_fr", ""),
            )
            created += 1
        return created
