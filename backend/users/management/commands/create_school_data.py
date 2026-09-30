from django.core.management.base import BaseCommand

from users.models import FieldOfStudy, Grade, SchoolLevel


# Algerian education system.
SCHOOL_LEVELS = {
    "ابتدائي": [
        "السنة الأولى ابتدائي",
        "السنة الثانية ابتدائي",
        "السنة الثالثة ابتدائي",
        "السنة الرابعة ابتدائي",
        "السنة الخامسة ابتدائي",
    ],
    "متوسط": [
        "السنة الأولى متوسط",
        "السنة الثانية متوسط",
        "السنة الثالثة متوسط",
        "السنة الرابعة متوسط",
    ],
    "ثانوي": [
        "السنة الأولى ثانوي",
        "السنة الثانية ثانوي",
        "السنة الثالثة ثانوي",
    ],
}

# Streams ("شعب") are only introduced in the 2nd and 3rd year of high school.
HIGH_SCHOOL_STREAMS = [
    "علوم تجريبية",
    "رياضيات",
    "تقني رياضي",
    "لغات أجنبية",
    "آداب وفلسفة",
    "تسيير واقتصاد",
]

FIELDS_BY_GRADE = {
    "السنة الثانية ثانوي": HIGH_SCHOOL_STREAMS,
    "السنة الثالثة ثانوي": HIGH_SCHOOL_STREAMS,
}


class Command(BaseCommand):
    help = "Create Algerian school levels, grades and fields of study (Arabic)."

    def handle(self, *args, **kwargs):
        for level_name, grades in SCHOOL_LEVELS.items():
            school_level, created = SchoolLevel.objects.get_or_create(
                name=level_name
            )
            self._report("School level", level_name, created)

            for grade_name in grades:
                grade, grade_created = Grade.objects.get_or_create(
                    name=grade_name, school_level=school_level
                )
                self._report("Grade", grade_name, grade_created)

                for field_name in FIELDS_BY_GRADE.get(grade_name, []):
                    field, field_created = FieldOfStudy.objects.get_or_create(
                        name=field_name, grade=grade
                    )
                    self._report(
                        f"Field of study ({grade_name})", field_name, field_created
                    )

    def _report(self, kind, name, created):
        if created:
            self.stdout.write(self.style.SUCCESS(f"{kind} '{name}' created."))
        else:
            self.stdout.write(self.style.WARNING(f"{kind} '{name}' already exists."))
