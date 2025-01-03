from django.core.management.base import BaseCommand
from users.models import SchoolLevel, FieldOfStudy, Grade


class Command(BaseCommand):
    help = "Create School Levels, Fields of Study, and Grades"

    def handle(self, *args, **kwargs):
        # Define data for school levels, fields of study, and grades
        school_levels = {
            "ابتدائي": ["السنة الاولى", "السنة الثانية", "السنة الثالثة", "السنة الرابعة", "السنة الخامسة"],
            "متوسط": ["السنة الاولى", "السنة الثانية", "السنة الثالثة", "السنة الرابعة",],
            "ثانوي": ["السنة الاولى", "السنة الثانية", "السنة الثالثة"],
            "جامعي": [],

        }
        fields_of_study = [
            "العلوم التجريبية",  # Experimental Sciences
            "الرياضيات",        # Mathematics
            "التقني رياضي",      # Technical Mathematics
            "اللغات الأجنبية",   # Foreign Languages
            "الآداب والفلسفة",   # Literature and Philosophy
            "التسيير والاقتصاد",  # Management and Economics
        ]

        # Add school levels and grades
        for level_name, grades in school_levels.items():
            school_level, created = SchoolLevel.objects.get_or_create(name=level_name)
            if created:
                self.stdout.write(self.style.SUCCESS(f"School Level '{level_name}' created."))
            else:
                self.stdout.write(self.style.WARNING(f"School Level '{level_name}' already exists."))

            # Add grades for the school level
            for grade_name in grades:
                grade, grade_created = Grade.objects.get_or_create(
                    name=grade_name, school_level=school_level
                )
                if grade_created:
                    self.stdout.write(self.style.SUCCESS(f"Grade '{grade_name}' created for '{level_name}'."))
                else:
                    self.stdout.write(self.style.WARNING(f"Grade '{grade_name}' already exists for '{level_name}'."))

        # Add fields of study for High School only
        high_school_level = SchoolLevel.objects.filter(name="High School").first()
        if high_school_level:
            for field in fields_of_study:
                field_of_study, created = FieldOfStudy.objects.get_or_create(name=field)
                if created:
                    self.stdout.write(self.style.SUCCESS(f"Field of Study '{field}' created for High School."))
                else:
                    self.stdout.write(self.style.WARNING(f"Field of Study '{field}' already exists for High School."))
        else:
            self.stdout.write(self.style.ERROR("High School level not found. Fields of study cannot be added."))