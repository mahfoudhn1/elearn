from django.db import models

from users.models import Student
from subscription.models import Subscription

GROUP_STATUS_CHOICES = [
        ('open', 'Open'),
        ('closed', 'Closed'),
    ]

from django.db import models

class SchoolLevel(models.Model):
    name = models.CharField(max_length=100, unique=True)

    def __str__(self):
        return self.name


class Grade(models.Model):
    name = models.CharField(max_length=50)
    school_level = models.ForeignKey(SchoolLevel, on_delete=models.CASCADE, related_name="grades")

    def __str__(self):
        return f"{self.name} ({self.school_level.name})"


class FieldOfStudy(models.Model):
    name = models.CharField(max_length=100)

    def __str__(self):
        return f"{self.name}"


class Schedule(models.Model):
    DAY_OF_WEEK_CHOICES = [
    ('الاثنين', 'الاثنين'),
    ('الثلاثاء', 'الثلاثاء'),
    ('الأربعاء', 'الأربعاء'),
    ('الخميس', 'الخميس'),
    ('الجمعة', 'الجمعة'),
    ('السبت', 'السبت'),
    ('الأحد', 'الأحد'),

    ]

    day_of_week = models.CharField(max_length=10, choices=DAY_OF_WEEK_CHOICES)
    start_time = models.TimeField()
    end_time = models.TimeField()

class Group(models.Model):
    name = models.CharField(max_length=200)
    admin = models.ForeignKey("users.Teacher", on_delete=models.CASCADE)
    students = models.ManyToManyField("users.Student")

    school_level = models.ForeignKey(SchoolLevel, on_delete=models.CASCADE, default=1)
    grade = models.ForeignKey(Grade, on_delete=models.CASCADE, default=1)
    field_of_study = models.ForeignKey(FieldOfStudy, on_delete=models.CASCADE, default=1)
    schedule = models.ManyToManyField(Schedule)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    status = models.CharField(max_length=20, choices=GROUP_STATUS_CHOICES, default='open')

    def __str__(self):
        return self.name

   
class StudentGroupRequest(models.Model):
    student = models.ForeignKey(Student, on_delete=models.CASCADE)
    group = models.ForeignKey(Group, on_delete=models.CASCADE)

    created_at = models.DateTimeField(auto_now_add=True)
    is_accepted = models.BooleanField(default=False)
    is_rejected = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.student} - {self.group} Request"