from django.db import models
from django.utils import timezone

from users.models import Student, Teacher


from core.models import UUIDModel
class Course(UUIDModel):
    """A course published by a teacher.

    Students only see a course while they are (or were) subscribed to the
    teacher. See ``courses.access`` for the subscription gating rules.
    """

    teacher = models.ForeignKey(
        Teacher, on_delete=models.CASCADE, related_name="courses"
    )
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True, default="")
    thumbnail = models.ImageField(upload_to="thumbnails/", null=True, blank=True)
    is_published = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.title

    @property
    def teacher_name(self):
        full_name = self.teacher.user.get_full_name().strip()
        return full_name or self.teacher.user.username


class Lesson(UUIDModel):
    course = models.ForeignKey(
        Course, on_delete=models.CASCADE, related_name="lessons"
    )
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True, default="")
    video = models.URLField(blank=True, default="")
    order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["order", "id"]

    def __str__(self):
        return self.title


class Material(UUIDModel):
    """A downloadable resource attached to a course and optionally a lesson."""

    course = models.ForeignKey(
        Course, on_delete=models.CASCADE, related_name="materials"
    )
    lesson = models.ForeignKey(
        Lesson,
        on_delete=models.CASCADE,
        related_name="materials",
        null=True,
        blank=True,
    )
    title = models.CharField(max_length=200)
    file = models.FileField(upload_to="materials/", null=True, blank=True)
    url = models.URLField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["id"]

    def __str__(self):
        return self.title


class UserLessonProgress(UUIDModel):
    student = models.ForeignKey(
        Student, on_delete=models.CASCADE, related_name="lesson_progress"
    )
    lesson = models.ForeignKey(
        Lesson, on_delete=models.CASCADE, related_name="progress"
    )
    is_finished = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ("student", "lesson")

    def __str__(self):
        return f"{self.student} - {self.lesson} - Finished: {self.is_finished}"

    def save(self, *args, **kwargs):
        if self.is_finished and not self.completed_at:
            self.completed_at = timezone.now()
        if not self.is_finished:
            self.completed_at = None
        super().save(*args, **kwargs)


class Survey(UUIDModel):
    """A survey/quiz designed by the teacher for a course (optionally a lesson)."""

    course = models.ForeignKey(
        Course, on_delete=models.CASCADE, related_name="surveys"
    )
    lesson = models.ForeignKey(
        Lesson,
        on_delete=models.CASCADE,
        related_name="surveys",
        null=True,
        blank=True,
    )
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True, default="")
    is_published = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["id"]

    def __str__(self):
        return self.title

    @property
    def total_points(self):
        return sum(question.points for question in self.questions.all())


class SurveyQuestion(UUIDModel):
    class QuestionType(models.TextChoices):
        MULTIPLE_CHOICE = "MULTIPLE_CHOICE", "Multiple choice"
        TRUE_FALSE = "TRUE_FALSE", "True / False"
        SHORT_ANSWER = "SHORT_ANSWER", "Short answer"

    survey = models.ForeignKey(
        Survey, on_delete=models.CASCADE, related_name="questions"
    )
    text = models.TextField()
    question_type = models.CharField(
        max_length=20,
        choices=QuestionType.choices,
        default=QuestionType.MULTIPLE_CHOICE,
    )
    # Expected answer for SHORT_ANSWER questions (graded case-insensitively).
    expected_answer = models.CharField(max_length=500, blank=True, default="")
    explanation = models.TextField(blank=True, default="")
    points = models.PositiveIntegerField(default=1)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order", "id"]

    def __str__(self):
        return self.text

    def correct_choice(self):
        return self.choices.filter(is_correct=True).first()


class SurveyChoice(UUIDModel):
    question = models.ForeignKey(
        SurveyQuestion, on_delete=models.CASCADE, related_name="choices"
    )
    text = models.CharField(max_length=500)
    is_correct = models.BooleanField(default=False)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order", "id"]

    def __str__(self):
        return self.text


class SurveyResponse(UUIDModel):
    """One submission of a survey by a student."""

    survey = models.ForeignKey(
        Survey, on_delete=models.CASCADE, related_name="responses"
    )
    student = models.ForeignKey(
        Student, on_delete=models.CASCADE, related_name="survey_responses"
    )
    score = models.PositiveIntegerField(default=0)
    submitted_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("survey", "student")
        ordering = ["-submitted_at"]

    def __str__(self):
        return f"{self.student} - {self.survey} - {self.score}"


class SurveyAnswer(UUIDModel):
    response = models.ForeignKey(
        SurveyResponse, on_delete=models.CASCADE, related_name="answers"
    )
    question = models.ForeignKey(
        SurveyQuestion, on_delete=models.CASCADE, related_name="answers"
    )
    choice = models.ForeignKey(
        SurveyChoice,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="answers",
    )
    text_answer = models.TextField(blank=True, default="")
    is_correct = models.BooleanField(default=False)

    class Meta:
        unique_together = ("response", "question")

    def __str__(self):
        return f"{self.response_id} - {self.question_id}"
