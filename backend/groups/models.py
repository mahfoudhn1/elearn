from datetime import datetime, timedelta
from django.db import models
from django.utils import timezone
from users.models import Student, User
from subscription.models import Subscription
from django.db import models


GROUP_STATUS_CHOICES = [
        ('open', 'Open'),
        ('closed', 'Closed'),
    ]




class Group(models.Model):
    name = models.CharField(max_length=200)
    admin = models.ForeignKey("users.Teacher", on_delete=models.CASCADE)
    students = models.ManyToManyField("users.Student", blank=True, related_name="groups")
    school_level = models.ForeignKey("users.SchoolLevel", on_delete=models.CASCADE, default=1)
    grade = models.ForeignKey('users.Grade', on_delete=models.CASCADE, default=1)
    field_of_study = models.ForeignKey("users.FieldOfStudy", on_delete=models.CASCADE, blank=True, null=True)  
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    status = models.CharField(max_length=20, choices=GROUP_STATUS_CHOICES, default='open')

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
    zoom_meeting_id = models.CharField(max_length=255, blank=True, null=True) 
    zoom_join_url = models.URLField(blank=True, null=True) 
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