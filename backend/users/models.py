from django.db import models

from django.contrib.auth.models import AbstractUser, Group, Permission

class User(AbstractUser):
    ROLE_CHOICE=(
        ("teacher", "Teacher"),
        ("student", "Student")
    )
    role = models.CharField(max_length=10, choices=ROLE_CHOICE, null=True, blank=True)



class SchoolChoice(models.TextChoices):
    PRIMARY = 'PRIMARY', 'Primary School'
    MIDDLE = 'MIDDLE', 'Middle School'
    SECONDARY = 'SECONDARY', 'Secondary School'
    HIGHER = 'HIGHER', 'Higher Education'

class subjsctChoice(models.TextChoices):
    MATHEMATICS = 'MATHEMATICS', 'Mathematics'
    PHYSICS = 'PHYSICS', 'Physics'
    CHEMISTRY = 'CHEMISTRY', 'Chemistry'
    BIOLOGY = 'BIOLOGY', 'Biology'
    FRENCH = 'FRENCH', 'French'
    ARABIC = 'ARABIC', 'Arabic'
    ENGLISH = 'ENGLISH', 'English'
    HISTORY = 'HISTORY', 'History'
    GEOGRAPHY = 'GEOGRAPHY', 'Geography'
    PHILOSOPHY = 'PHILOSOPHY', 'Philosophy'
    ECONOMICS = 'ECONOMICS', 'Economics'




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
    teaching_level = models.CharField(max_length=20, choices = SchoolChoice.choices, null=True, blank=True) 
    teaching_subjects = models.CharField(max_length=20, choices = subjsctChoice.choices, null=True, blank=True) 
    price = models.IntegerField(default=1000)
    phone_number = models.CharField( max_length=10, null=True, blank=True)
    first_name = models.CharField(max_length=20, null=True, blank=True)
    last_name = models.CharField(max_length=20, null=True, blank=True)
    avatar = models.ImageField(upload_to='profile_pics/', null=True, blank=True)
    profession = models.CharField(max_length=100, null=True, blank=True)
    degree = models.CharField(max_length=100, null=True, blank=True)
    wilaya = models.CharField(max_length=20, null=True, blank=True)
    university = models.CharField(max_length=100, null=True, blank=True)
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