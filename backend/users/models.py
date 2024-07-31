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

class Teacher(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    profile_privet = models.BooleanField(default=True)
    modules = models.ManyToManyField(Module)
    grades = models.ManyToManyField(Grade)
    specialities = models.ManyToManyField(Speciality)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class Student(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    grade = models.ForeignKey(Grade, on_delete=models.SET_NULL, null=True)
