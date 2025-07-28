from datetime import datetime, timedelta
from django.db import models
from django.utils import timezone
from languagesteaching.models import Language, LanguageLevel
from users.models import Student, User
from subscription.models import Subscription
from django.db import models


GROUP_STATUS_CHOICES = [
        ('open', 'Open'),
        ('closed', 'Closed'),
    ]

class Group(models.Model):
    class GroupType(models.TextChoices):
        ACADEMIC = 'ACADEMIC', 'Academic'
        LANGUAGE = 'LANGUAGE', 'Language'

    name = models.CharField(max_length=200)
    admin = models.ForeignKey("users.Teacher", on_delete=models.CASCADE)
    students = models.ManyToManyField("users.Student", blank=True, related_name="groups")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    status = models.CharField(max_length=20, choices=GROUP_STATUS_CHOICES, default='open')
    group_type = models.CharField(max_length=10, choices=GroupType.choices, default=GroupType.ACADEMIC)

    school_level = models.ForeignKey("users.SchoolLevel", on_delete=models.CASCADE, blank=True, null=True)
    grade = models.ForeignKey('users.Grade', on_delete=models.CASCADE, blank=True, null=True)
    field_of_study = models.ForeignKey("users.FieldOfStudy", on_delete=models.CASCADE, blank=True, null=True)

    # For language groups
    language = models.ForeignKey(Language, on_delete=models.CASCADE, blank=True, null=True)
    language_level = models.ForeignKey(LanguageLevel, on_delete=models.CASCADE, blank=True, null=True)


    def __str__(self):
        return self.name

    
    def __str__(self):
        return self.name

class Schedule(models.Model):
    
    SCHEDULE_TYPE_CHOICES = [
        ('weekly', 'Weekly Recurring'),
        ('custom', 'One-Time Custom')
    ]
    
    user = models.ForeignKey("users.User", verbose_name=("users"), on_delete=models.CASCADE)
    day_of_week = models.CharField(max_length=10)  
    scheduled_date = models.DateField(null=True)
    start_time = models.TimeField(null=True)
    end_time = models.TimeField(null=True) 
    group = models.ForeignKey(Group, on_delete=models.CASCADE, default=6)
    schedule_type = models.CharField(max_length=10, choices=SCHEDULE_TYPE_CHOICES, default='weekly')
    color = models.CharField(max_length=20, default='blue-500')
    Meeting = models.ForeignKey('jitsi.Meeting', on_delete=models.SET_NULL, blank=True, null=True)
    # zoom_meeting_id = models.CharField(max_length=255, blank=True, null=True) 
    # zoom_join_url = models.URLField(blank=True, null=True) 
    def update_scheduled_date(self):
        today = datetime.now().date()
        

        if self.schedule_type == 'weekly' and self.scheduled_date < today:
            self.scheduled_date = self.get_next_occurrence_of_day()
        self.save()

    def get_next_occurrence_of_day(self):
        """Calculates the next occurrence of the day_of_week from today."""
        today = datetime.now().date()
        days_ahead = (self.get_weekday_index() - today.weekday()) % 7
        if days_ahead == 0:  # If it's the same day and in the past, move to the next week
            days_ahead = 7
        return today + timedelta(days=days_ahead)

    def get_weekday_index(self):
        """Converts the day_of_week into a numeric index (0 for Monday, 6 for Sunday)."""
        days_of_week = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
        return days_of_week.index(self.day_of_week.lower())
    
    def __str__(self) -> str:
        return f"{self.user}, {self.day_of_week}, {self.scheduled_date}"
   
class StudentGroupRequest(models.Model):
    student = models.ForeignKey(Student, on_delete=models.CASCADE)
    group = models.ForeignKey(Group, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    is_accepted = models.BooleanField(default=False)
    is_rejected = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.student} - {self.group.name} Request"
    
    

    
class Quiz(models.Model):
    teacher = models.ForeignKey(User, on_delete=models.CASCADE, related_name='quizzes_created')
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    time_limit_minutes = models.PositiveIntegerField(default=30)
    is_published = models.BooleanField(default=False)

class Question(models.Model):
    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, blank=True, null=True, related_name='questions')
    QUESTION_TYPES = [
        ('MC', 'Multiple Choice'),
        ('TF', 'True/False'),
        ('SA', 'Short Answer'),
    ]
    question_type = models.CharField(max_length=2, choices=QUESTION_TYPES, null=True, blank=True)
    text = models.TextField()
    # For MC questions, store options as JSON
    options = models.JSONField(blank=True, null=True) 
    correct_answer = models.JSONField(null=True, blank=True)  # Can store various answer types
    points = models.PositiveIntegerField(default=1)
    order = models.PositiveIntegerField(default=1)

class QuizAttempt(models.Model):
    student = models.ForeignKey("users.student", on_delete=models.CASCADE, related_name='quiz_attempts')
    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE,null=True, blank=True, related_name='attempts')
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    score = models.FloatField(null=True, blank=True)

class StudentAnswer(models.Model):
    attempt = models.ForeignKey(QuizAttempt, on_delete=models.CASCADE, null=True, blank=True, related_name='answers')
    question = models.ForeignKey(Question, on_delete=models.CASCADE)
    answer = models.JSONField(null=True, blank=True)  # Stores student's answer in format matching question type
    is_correct = models.BooleanField(default=False)
    awarded_points = models.FloatField(default=0)

    
class GroupCourse(models.Model):
    group = models.ForeignKey(Group, on_delete=models.CASCADE, related_name="courses")
    teacher = models.ForeignKey("users.Teacher", on_delete=models.CASCADE)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    group_video = models.FileField(upload_to='group_courses/videos/', blank=True, null=True)  
    created_at = models.DateTimeField(default=timezone.now)

    quiz = models.ForeignKey(Quiz , on_delete=models.SET_NULL, null=True, blank=True)

    def __str__(self):
        return f"{self.title} - {self.group.name}"
