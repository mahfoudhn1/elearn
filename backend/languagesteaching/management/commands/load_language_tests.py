from django.core.management.base import BaseCommand
from languagesteaching.models import Language, LanguageLevel, Question

class Command(BaseCommand):
    help = "Load test languages and questions into the database for development."

    def handle(self, *args, **kwargs):
        # Clear existing data if desired
        Question.objects.all().delete()
        Language.objects.all().delete()
        LanguageLevel.objects.all().delete()

        # Create Languages
        english = Language.objects.create(name="English")
        french = Language.objects.create(name="French")

        # Create Levels
        beginner = LanguageLevel.objects.create(name="Beginner", description="Beginner Level")
        intermediate = LanguageLevel.objects.create(name="Intermediate", description="Intermediate Level")

        # English Questions
        Question.objects.create(
            language=english,
            
            text="What is the capital of the UK?",
            question_type="multiple_choice",
            options={
                "A": "London",
                "B": "Paris",
                "C": "Berlin",
                "D": "Madrid"
            },
            correct_answer="A",
            explanation="London is the capital of the UK."
        )

        Question.objects.create(
            language=english,
            
            text="The past tense of 'go' is ____.",
            question_type="fill_blank",
            correct_answer="went",
            explanation="'Went' is the past tense of 'go'."
        )

        Question.objects.create(
            language=english,
            
            text="Is 'cat' an animal?",
            question_type="true_false",
            correct_answer="True",
            explanation="A cat is an animal."
        )

        Question.objects.create(
            language=english,
            
            text="Which of these is a synonym for 'happy'?",
            question_type="multiple_choice",
            options={
                "A": "Sad",
                "B": "Angry",
                "C": "Joyful",
                "D": "Tired"
            },
            correct_answer="C",
            explanation="'Joyful' is a synonym for 'happy'."
        )

        Question.objects.create(
            language=english,
            
            text="The plural of 'child' is ____.",
            question_type="fill_blank",
            correct_answer="children",
            explanation="The plural of 'child' is 'children'."
        )
        Question.objects.create(
            language=english,
            
            text="The plural of 'child' is ____.",
            question_type="fill_blank",
            correct_answer="children",
            explanation="The plural of 'child' is 'children'."
        )
        Question.objects.create(
            language=english,
            
            text="The plural of 'child' is ____.",
            question_type="fill_blank",
            correct_answer="children",
            explanation="The plural of 'child' is 'children'."
        )
        Question.objects.create(
            language=english,
            
            text="The plural of 'child' is ____.",
            question_type="fill_blank",
            correct_answer="children",
            explanation="The plural of 'child' is 'children'."
        )
        Question.objects.create(
            language=english,
            
            text="The plural of 'child' is ____.",
            question_type="fill_blank",
            correct_answer="children",
            explanation="The plural of 'child' is 'children'."
        )
        Question.objects.create(
            language=english,
            
            text="The plural of 'child' is ____.",
            question_type="fill_blank",
            correct_answer="children",
            explanation="The plural of 'child' is 'children'."
        )
        Question.objects.create(
            language=english,
            
            text="The plural of 'child' is ____.",
            question_type="fill_blank",
            correct_answer="children",
            explanation="The plural of 'child' is 'children'."
        )
        Question.objects.create(
            language=english,
            
            text="The plural of 'child' is ____.",
            question_type="fill_blank",
            correct_answer="children",
            explanation="The plural of 'child' is 'children'."
        )
        Question.objects.create(
            language=english,
            
            text="The plural of 'child' is ____.",
            question_type="fill_blank",
            correct_answer="children",
            explanation="The plural of 'child' is 'children'."
        )
        Question.objects.create(
            language=english,
            
            text="The plural of 'child' is ____.",
            question_type="fill_blank",
            correct_answer="children",
            explanation="The plural of 'child' is 'children'."
        )
        Question.objects.create(
            language=english,
            
            text="The plural of 'child' is ____.",
            question_type="fill_blank",
            correct_answer="children",
            explanation="The plural of 'child' is 'children'."
        )
        Question.objects.create(
            language=english,
            
            text="The plural of 'child' is ____.",
            question_type="fill_blank",
            correct_answer="children",
            explanation="The plural of 'child' is 'children'."
        )
        Question.objects.create(
            language=english,
            
            text="The plural of 'child' is ____.",
            question_type="fill_blank",
            correct_answer="children",
            explanation="The plural of 'child' is 'children'."
        )
        Question.objects.create(
            language=english,
            
            text="The plural of 'child' is ____.",
            question_type="fill_blank",
            correct_answer="children",
            explanation="The plural of 'child' is 'children'."
        )
        Question.objects.create(
            language=english,
            
            text="The plural of 'child' is ____.",
            question_type="fill_blank",
            correct_answer="children",
            explanation="The plural of 'child' is 'children'."
        )
        Question.objects.create(
            language=english,
            
            text="The plural of 'child' is ____.",
            question_type="fill_blank",
            correct_answer="children",
            explanation="The plural of 'child' is 'children'."
        )
        Question.objects.create(
            language=english,
            
            text="The plural of 'child' is ____.",
            question_type="fill_blank",
            correct_answer="children",
            explanation="The plural of 'child' is 'children'."
        )
        Question.objects.create(
            language=english,
            
            text="The plural of 'child' is ____.",
            question_type="fill_blank",
            correct_answer="children",
            explanation="The plural of 'child' is 'children'."
        )
        Question.objects.create(
            language=english,
            
            text="The plural of 'child' is ____.",
            question_type="fill_blank",
            correct_answer="children",
            explanation="The plural of 'child' is 'children'."
        )
        Question.objects.create(
            language=english,
            
            text="The plural of 'child' is ____.",
            question_type="fill_blank",
            correct_answer="children",
            explanation="The plural of 'child' is 'children'."
        )
        Question.objects.create(
            language=english,
            
            text="The plural of 'child' is ____.",
            question_type="fill_blank",
            correct_answer="children",
            explanation="The plural of 'child' is 'children'."
        )
        Question.objects.create(
            language=english,
            
            text="The plural of 'child' is ____.",
            question_type="fill_blank",
            correct_answer="children",
            explanation="The plural of 'child' is 'children'."
        )
        Question.objects.create(
            language=english,
            
            text="The plural of 'child' is ____.",
            question_type="fill_blank",
            correct_answer="children",
            explanation="The plural of 'child' is 'children'."
        )
        Question.objects.create(
            language=english,
            
            text="The plural of 'child' is ____.",
            question_type="fill_blank",
            correct_answer="children",
            explanation="The plural of 'child' is 'children'."
        )
        Question.objects.create(
            language=english,
            
            text="The plural of 'child' is ____.",
            question_type="fill_blank",
            correct_answer="children",
            explanation="The plural of 'child' is 'children'."
        )
        Question.objects.create(
            language=english,
            
            text="The plural of 'child' is ____.",
            question_type="fill_blank",
            correct_answer="children",
            explanation="The plural of 'child' is 'children'."
        )
        Question.objects.create(
            language=english,
            
            text="The plural of 'child' is ____.",
            question_type="fill_blank",
            correct_answer="children",
            explanation="The plural of 'child' is 'children'."
        )
        Question.objects.create(
            language=english,
            
            text="The plural of 'child' is ____.",
            question_type="fill_blank",
            correct_answer="children",
            explanation="The plural of 'child' is 'children'."
        )
        Question.objects.create(
            language=english,
            
            text="The plural of 'child' is ____.",
            question_type="fill_blank",
            correct_answer="children",
            explanation="The plural of 'child' is 'children'."
        )
        Question.objects.create(
            language=english,
            
            text="The plural of 'child' is ____.",
            question_type="fill_blank",
            correct_answer="children",
            explanation="The plural of 'child' is 'children'."
        )
        Question.objects.create(
            language=english,
            
            text="The plural of 'child' is ____.",
            question_type="fill_blank",
            correct_answer="children",
            explanation="The plural of 'child' is 'children'."
        )
        Question.objects.create(
            language=english,
            
            text="The plural of 'child' is ____.",
            question_type="fill_blank",
            correct_answer="children",
            explanation="The plural of 'child' is 'children'."
        )


        # French Questions
        Question.objects.create(
            language=french,
            
            text="Quelle est la capitale de la France?",
            question_type="multiple_choice",
            options={
                "A": "Rome",
                "B": "Madrid",
                "C": "Paris",
                "D": "Berlin"
            },
            correct_answer="C",
            explanation="Paris est la capitale de la France."
        )

        Question.objects.create(
            language=french,
            
            text="Le ciel est vert.",
            question_type="true_false",
            correct_answer="False",
            explanation="Le ciel est généralement bleu, pas vert."
        )

        Question.objects.create(
            language=french,
            
            text="La couleur du lait est ____.",
            question_type="fill_blank",
            correct_answer="blanc",
            explanation="Le lait est de couleur blanche."
        )

        Question.objects.create(
            language=french,
            
            text="Quel est le contraire de 'grand'?",
            question_type="multiple_choice",
            options={
                "A": "Petit",
                "B": "Rapide",
                "C": "Lourd",
                "D": "Fort"
            },
            correct_answer="A",
            explanation="Le contraire de 'grand' est 'petit'."
        )

        Question.objects.create(
            language=french,
            
            text="Le mot 'maison' signifie ____ en anglais.",
            question_type="fill_blank",
            correct_answer="house",
            explanation="Le mot 'maison' signifie 'house' en anglais."
        )

        self.stdout.write(self.style.SUCCESS("✅ Test languages, levels, and extended questions loaded successfully."))
