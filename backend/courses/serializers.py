from django.db import transaction
from rest_framework import serializers
from core.serializers import UUIDModelSerializer, UUIDRelatedField

from users.models import Teacher

from .access import course_access_info
from .models import (
    Course,
    Lesson,
    Material,
    Survey,
    SurveyAnswer,
    SurveyChoice,
    SurveyQuestion,
    SurveyResponse,
    UserLessonProgress,
)


def user_is_course_owner(user, course):
    teacher = getattr(user, "teacher", None)
    return bool(teacher and course.teacher_id == teacher.id)


class TeacherBriefSerializer(UUIDModelSerializer):
    name = serializers.SerializerMethodField()
    username = serializers.CharField(source="user.username", read_only=True)
    avatar = serializers.SerializerMethodField()

    class Meta:
        model = Teacher
        fields = [
            "id",
            "name",
            "username",
            "avatar",
            "teaching_subjects",
            "teaching_level",
            "wilaya",
            "bio",
        ]

    def get_name(self, obj):
        full_name = obj.user.get_full_name().strip()
        return full_name or obj.user.username

    def get_avatar(self, obj):
        url = obj.user.get_avatar()
        request = self.context.get("request")
        if url and request:
            return request.build_absolute_uri(url)
        return url


class MaterialSerializer(UUIDModelSerializer):
    file = serializers.FileField(required=False, allow_null=True)

    class Meta:
        model = Material
        fields = ["id", "course", "lesson", "title", "file", "url", "created_at"]
        read_only_fields = ["created_at"]

    def validate(self, attrs):
        file = attrs.get("file", getattr(self.instance, "file", None))
        url = attrs.get("url", getattr(self.instance, "url", ""))
        lesson = attrs.get("lesson", getattr(self.instance, "lesson", None))
        course = attrs.get("course", getattr(self.instance, "course", None))

        if not file and not url:
            raise serializers.ValidationError(
                "Provide a file or a URL for the material."
            )
        if lesson and course and lesson.course_id != course.id:
            raise serializers.ValidationError(
                {"lesson": "The lesson does not belong to this course."}
            )
        if lesson and not course:
            attrs["course"] = lesson.course
        return attrs


class LessonSerializer(UUIDModelSerializer):
    materials = MaterialSerializer(many=True, read_only=True)
    is_finished = serializers.SerializerMethodField()

    class Meta:
        model = Lesson
        fields = [
            "id",
            "course",
            "title",
            "description",
            "video",
            "order",
            "created_at",
            "materials",
            "is_finished",
        ]
        read_only_fields = ["created_at"]

    def get_is_finished(self, obj):
        request = self.context.get("request")
        student = getattr(request.user, "student", None) if request else None
        if not student:
            return False
        progress = UserLessonProgress.objects.filter(
            student=student, lesson=obj, is_finished=True
        )
        return progress.exists()


class LessonListSerializer(UUIDModelSerializer):
    """Lightweight lesson payload for nested course output."""

    materials_count = serializers.SerializerMethodField()
    is_finished = serializers.SerializerMethodField()

    class Meta:
        model = Lesson
        fields = [
            "id",
            "course",
            "title",
            "description",
            "video",
            "order",
            "created_at",
            "materials_count",
            "is_finished",
        ]

    def get_materials_count(self, obj):
        return obj.materials.count()

    def get_is_finished(self, obj):
        request = self.context.get("request")
        student = getattr(request.user, "student", None) if request else None
        if not student:
            return False
        return UserLessonProgress.objects.filter(
            student=student, lesson=obj, is_finished=True
        ).exists()


class SurveySummarySerializer(UUIDModelSerializer):
    questions_count = serializers.SerializerMethodField()

    class Meta:
        model = Survey
        fields = [
            "id",
            "course",
            "lesson",
            "title",
            "description",
            "is_published",
            "created_at",
            "questions_count",
        ]

    def get_questions_count(self, obj):
        return obj.questions.count()


class CourseListSerializer(UUIDModelSerializer):
    teacher = TeacherBriefSerializer(read_only=True)
    teacher_name = serializers.CharField(read_only=True)
    lessons_count = serializers.IntegerField(read_only=True)
    materials_count = serializers.IntegerField(read_only=True)
    surveys_count = serializers.IntegerField(read_only=True)
    access = serializers.SerializerMethodField()

    class Meta:
        model = Course
        fields = [
            "id",
            "title",
            "description",
            "thumbnail",
            "is_published",
            "created_at",
            "updated_at",
            "teacher",
            "teacher_name",
            "lessons_count",
            "materials_count",
            "surveys_count",
            "access",
        ]

    def get_access(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return {
                "has_subscription": False,
                "subscription_active": False,
                "is_locked": True,
                "is_owner": False,
            }
        if user_is_course_owner(request.user, obj):
            return {
                "has_subscription": None,
                "subscription_active": None,
                "is_locked": False,
                "is_owner": True,
            }
        student = getattr(request.user, "student", None)
        if not student:
            return {
                "has_subscription": False,
                "subscription_active": False,
                "is_locked": True,
                "is_owner": False,
            }
        info = course_access_info(student, obj)
        info["is_owner"] = False
        return info


class CourseDetailSerializer(CourseListSerializer):
    lessons = LessonListSerializer(many=True, read_only=True)
    materials = serializers.SerializerMethodField()
    surveys = serializers.SerializerMethodField()
    progress = serializers.SerializerMethodField()

    class Meta(CourseListSerializer.Meta):
        fields = CourseListSerializer.Meta.fields + [
            "lessons",
            "materials",
            "surveys",
            "progress",
        ]

    def get_materials(self, obj):
        materials = [m for m in obj.materials.all() if m.lesson_id is None]
        return MaterialSerializer(
            materials, many=True, context=self.context
        ).data

    def get_surveys(self, obj):
        if user_is_course_owner(self.context["request"].user, obj):
            surveys = obj.surveys.all()
        else:
            surveys = [s for s in obj.surveys.all() if s.is_published]

        return SurveySummarySerializer(
            surveys, many=True, context=self.context
        ).data

    def get_progress(self, obj):
        request = self.context.get("request")
        student = getattr(request.user, "student", None) if request else None
        if not student:
            return None

        lessons = list(obj.lessons.all())
        total = len(lessons)
        completed = UserLessonProgress.objects.filter(
            student=student, lesson_id__in=[lesson.id for lesson in lessons],
            is_finished=True,
        ).count()
        percent = round((completed / total) * 100) if total else 0
        return {"completed": completed, "total": total, "percent": percent}


class CourseWriteSerializer(UUIDModelSerializer):
    class Meta:
        model = Course
        fields = ["id", "title", "description", "thumbnail", "is_published"]


class SurveyChoiceSerializer(UUIDModelSerializer):
    class Meta:
        model = SurveyChoice
        fields = ["id", "text", "is_correct", "order"]


class SurveyQuestionSerializer(UUIDModelSerializer):
    choices = serializers.SerializerMethodField()

    class Meta:
        model = SurveyQuestion
        fields = [
            "id",
            "text",
            "question_type",
            "points",
            "order",
            "explanation",
            "expected_answer",
            "choices",
        ]

    def get_choices(self, obj):
        choices = obj.choices.all()
        data = SurveyChoiceSerializer(choices, many=True).data
        request = self.context.get("request")
        course = obj.survey.course
        is_owner = bool(request and user_is_course_owner(request.user, course))

        if is_owner:
            return data

        # Never leak correct answers to students before they submit.
        for choice in data:
            choice.pop("is_correct", None)
            choice.pop("order", None)
        data_fields = ["id", "text"]
        return [{key: choice[key] for key in data_fields} for choice in data]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        request = self.context.get("request")
        is_owner = bool(
            request and user_is_course_owner(request.user, instance.survey.course)
        )
        if not is_owner:
            data.pop("expected_answer", None)
            data.pop("explanation", None)
        return data


class SurveyDetailSerializer(UUIDModelSerializer):
    questions = SurveyQuestionSerializer(many=True, read_only=True)
    total_points = serializers.IntegerField(read_only=True)
    my_response = serializers.SerializerMethodField()

    class Meta:
        model = Survey
        fields = [
            "id",
            "course",
            "lesson",
            "title",
            "description",
            "is_published",
            "created_at",
            "total_points",
            "questions",
            "my_response",
        ]

    def get_my_response(self, obj):
        request = self.context.get("request")
        student = getattr(request.user, "student", None) if request else None
        if not student:
            return None
        response = (
            SurveyResponse.objects.filter(survey=obj, student=student)
            .prefetch_related("answers")
            .first()
        )
        if not response:
            return None
        return SurveyResponseSerializer(response, context=self.context).data


class SurveyChoiceWriteSerializer(UUIDModelSerializer):
    class Meta:
        model = SurveyChoice
        fields = ["id", "text", "is_correct", "order"]


class SurveyQuestionWriteSerializer(UUIDModelSerializer):
    choices = SurveyChoiceWriteSerializer(many=True, required=False, default=list)

    class Meta:
        model = SurveyQuestion
        fields = [
            "id",
            "text",
            "question_type",
            "expected_answer",
            "explanation",
            "points",
            "order",
            "choices",
        ]

    def validate(self, attrs):
        question_type = attrs.get(
            "question_type", getattr(self.instance, "question_type", None)
        )
        choices = attrs.get("choices", [])
        expected_answer = attrs.get(
            "expected_answer", getattr(self.instance, "expected_answer", "")
        )

        if question_type == SurveyQuestion.QuestionType.SHORT_ANSWER:
            if not expected_answer:
                raise serializers.ValidationError(
                    {"expected_answer": "Short answer questions need an expected answer."}
                )
        else:
            if len(choices) < 2:
                raise serializers.ValidationError(
                    {"choices": "Provide at least two choices."}
                )
            correct = [choice for choice in choices if choice.get("is_correct")]
            if len(correct) != 1:
                raise serializers.ValidationError(
                    {"choices": "Mark exactly one choice as correct."}
                )
        return attrs


class SurveyWriteSerializer(UUIDModelSerializer):
    questions = SurveyQuestionWriteSerializer(many=True)

    class Meta:
        model = Survey
        fields = [
            "id",
            "course",
            "lesson",
            "title",
            "description",
            "is_published",
            "questions",
        ]

    def validate(self, attrs):
        course = attrs.get("course", getattr(self.instance, "course", None))
        lesson = attrs.get("lesson", getattr(self.instance, "lesson", None))
        if lesson and course and lesson.course_id != course.id:
            raise serializers.ValidationError(
                {"lesson": "The lesson does not belong to this course."}
            )
        if not attrs.get("questions") and not self.instance:
            raise serializers.ValidationError(
                {"questions": "A survey needs at least one question."}
            )
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        questions = validated_data.pop("questions", [])
        survey = Survey.objects.create(**validated_data)
        self._sync_questions(survey, questions)
        return survey

    @transaction.atomic
    def update(self, instance, validated_data):
        questions = validated_data.pop("questions", None)
        for key, value in validated_data.items():
            setattr(instance, key, value)
        instance.save()
        if questions is not None:
            instance.questions.all().delete()
            self._sync_questions(instance, questions)
        return instance

    def _sync_questions(self, survey, questions):
        for question_data in questions:
            choices = question_data.pop("choices", [])
            question_data.pop("id", None)
            question = SurveyQuestion.objects.create(survey=survey, **question_data)
            for choice_data in choices:
                choice_data.pop("id", None)
                SurveyChoice.objects.create(question=question, **choice_data)


class SurveyAnswerInputSerializer(serializers.Serializer):
    question = serializers.UUIDField()
    choice = serializers.UUIDField(required=False, allow_null=True)
    text_answer = serializers.CharField(
        required=False, allow_blank=True, default=""
    )


class SurveySubmitSerializer(serializers.Serializer):
    answers = SurveyAnswerInputSerializer(many=True)

    def validate_answers(self, answers):
        if not answers:
            raise serializers.ValidationError("Provide at least one answer.")
        return answers


class SurveyAnswerSerializer(UUIDModelSerializer):
    question_text = serializers.CharField(source="question.text", read_only=True)

    class Meta:
        model = SurveyAnswer
        fields = [
            "id",
            "question",
            "question_text",
            "choice",
            "text_answer",
            "is_correct",
        ]


class SurveyResponseSerializer(UUIDModelSerializer):
    answers = SurveyAnswerSerializer(many=True, read_only=True)
    student_name = serializers.SerializerMethodField()

    class Meta:
        model = SurveyResponse
        fields = [
            "id",
            "survey",
            "student",
            "student_name",
            "score",
            "submitted_at",
            "updated_at",
            "answers",
        ]

    def get_student_name(self, obj):
        return str(obj.student)
