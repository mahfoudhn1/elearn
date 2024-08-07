from django.db import models

from users.models import StudentBranch, StudentClass, Student
from subscription.models import Subscription

GROUP_STATUS_CHOICES = [
        ('open', 'Open'),
        ('closed', 'Closed'),
    ]

class Group(models.Model):
    name = models.CharField(max_length=200)
    admin = models.ForeignKey("users.Teacher", on_delete=models.CASCADE)
    students = models.ManyToManyField("users.Student")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    branch = models.CharField(
        max_length=50,
        choices= StudentBranch
        )
    student_class = models.CharField(
        max_length=50,
        choices= StudentClass
        )
    
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