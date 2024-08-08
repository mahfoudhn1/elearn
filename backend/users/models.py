from django.db import models

from django.contrib.auth.models import AbstractUser, Group, Permission

class User(AbstractUser):
    ROLE_CHOICE=(
        ("teacher", "Teacher"),
        ("student", "Student")
    )
    role = models.CharField(max_length=10, choices=ROLE_CHOICE)



class Module(models.Model):
    name = models.CharField(max_length=100)

    def __str__(self):
        return self.name

class Grade(models.Model):
    name = models.CharField(max_length=100)

    def __str__(self):
        return self.name

class Speciality(models.Model):
    name = models.CharField(max_length=100)

    def __str__(self):
        return self.name

class StudentClass(models.TextChoices):
    FIRST_YEAR = 'F1', 'First Year'
    SECOND_YEAR = 'F2', 'Second Year'
    THIRD_YEAR = 'F3', 'Third Year'

class StudentBranch(models.TextChoices):
    MATHEMATICS = 'SM', 'Science and Mathematics'
    SCIENCE = 'ST', 'Science '
    ECONOMICS = 'EC', 'Economics'
    LITERARY = 'LI', 'Literary'
    TECHNICAL = 'TC', 'Technical'

class Teacher(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    profile_privet = models.BooleanField(default=True)
    modules = models.ManyToManyField(Module)
    grades = models.ManyToManyField(Grade)
    phone_number = models.CharField( max_length=10, null=True, blank=True)
    first_name = models.CharField(max_length=20, null=True, blank=True)
    last_name = models.CharField(max_length=20, null=True, blank=True)
    specialities = models.ManyToManyField(Speciality)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class Student(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    phone_number = models.CharField( max_length=10, null=True, blank=True)
    first_name = models.CharField(max_length=20, null=True, blank=True)
    last_name = models.CharField(max_length=20, null=True, blank=True)
    branch = models.CharField(
        max_length=10,
        choices = StudentBranch.choices
        )
    student_class = models.CharField(
        max_length=10,
        choices = StudentClass.choices
        )