# assessments/serializers.py
from django.shortcuts import get_object_or_404
from rest_framework import serializers

from    users.models import Student
from .models import Question
from .models import Language, LanguageLevel, StudentLanguageProficiency

class LanguageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Language 
        fields = '__all__'

class LanguageLevelSerializer(serializers.ModelSerializer):
    class Meta:
        model = LanguageLevel
        fields = ['id', 'name', 'description']

class LanguageTestSerializer(serializers.ModelSerializer):
    class Meta:
        model = Language
        fields = ['id', 'name']

class QuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Question
        fields = ['id', 'text', 'options','question_type', 'correct_answer' ]

class StudentLanguageProficiencySerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.user.get_full_name', read_only=True)
    language_name = serializers.CharField(source='language.name', read_only=True)
    level_name = serializers.CharField(source='level.name', read_only=True)

    class Meta:
        model = StudentLanguageProficiency
        fields = ['id', 'student', 'student_name', 'language', 'language_name', 'level', 'level_name', 'score']
        read_only_fields = ['student']

class TestSubmissionSerializer(serializers.Serializer):
    language_id = serializers.IntegerField()
    answers = serializers.JSONField()

    def validate(self, data):
        # Add validation logic here
        return data

    def create(self, validated_data):
        request = self.context.get('request')
        student = Student.objects.get(user=request.user)
        
        # Calculate score and determine level
        score = self.calculate_score(validated_data['answers'])
        level = self.determine_level(score)
        language = Language.objects.get(id=18)
        
        # Update or create proficiency
        proficiency, created = StudentLanguageProficiency.objects.update_or_create(
            student=student,
            language=language,
            defaults={
                'level': level,
                'score': score
            }
        )
        
        return {
            'proficiency': proficiency,
            'score': score,
            'level': level,
            'language': language,
            'level_name': level.name,
            'language_name': language.name,
        }

    def calculate_score(self, answers):
        correct_count = 0
        for answer_data in answers:
            question = get_object_or_404(Question, id=answer_data['question_id'])
            print(question)
            user_answer = answer_data['answer'].strip().upper()
            correct_answer = question.correct_answer.strip().upper() if question.correct_answer else ""

            if user_answer == correct_answer:
                correct_count += 1

        total_questions = len(answers)
        if total_questions == 0:
            return 0

        score_percentage = int((correct_count / total_questions) * 100)

        return score_percentage

    def determine_level(self, score):
        level = 'A1'  
        if score >= 90:
            level = 'C2'
        elif score >= 80:
            level = 'C1'
        elif score >= 70:
            level = 'B2'
        elif score >= 60:
            level = 'B1'
        elif score >= 50:
            level = 'A2'

        return get_object_or_404(LanguageLevel, name=level)
