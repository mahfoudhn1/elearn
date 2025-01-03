from django.db import models

from django.contrib.auth.models import AbstractUser, Group, Permission

class User(AbstractUser):
    ROLE_CHOICE=(
        ("teacher", "Teacher"),
        ("student", "Student")
    )
    role = models.CharField(max_length=10, choices=ROLE_CHOICE, null=True, blank=True)
    zoom_access_token = models.CharField( null=True, blank=True)
    zoom_refresh_token = models.CharField( null=True, blank=True)
    zoom_token_expires_at = models.DateTimeField(null=True, blank=True)


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

class SchoolChoice(models.TextChoices):
    PRIMARY = 'PRIMARY', 'Primary School'
    MIDDLE = 'MIDDLE', 'Middle School'
    SECONDARY = 'SECONDARY', 'Secondary School'
    HIGHER = 'HIGHER', 'Higher Education'

class subjsctChoice(models.TextChoices):
    MATHEMATICS = 'رياضيات', 'رياضيات'
    PHYSICS = 'فيزياء', 'فيزياء'
    CHEMISTRY = 'كيمياء', 'كيمياء'
    BIOLOGY = 'أحياء', 'أحياء'
    FRENCH = 'فرنسية', 'فرنسية'
    ARABIC = 'عربية', 'عربية'
    ENGLISH = 'إنجليزية', 'إنجليزية'
    HISTORY = 'تاريخ', 'تاريخ'
    GEOGRAPHY = 'جغرافيا', 'جغرافيا'
    PHILOSOPHY = 'فلسفة', 'فلسفة'
    ECONOMICS = 'اقتصاد', 'اقتصاد'


class Teacher(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    profile_privet = models.BooleanField(default=True)
    teaching_level = models.CharField(max_length=20, choices = SchoolChoice.choices, null=True, blank=True) 
    teaching_subjects = models.CharField(max_length=20, choices = subjsctChoice.choices, null=True, blank=True) 
    price = models.IntegerField(default=1000)
    phone_number = models.CharField( max_length=10, null=True, blank=True)
    first_name =models.CharField( max_length=20, null=True, blank=True)
    last_name =models.CharField( max_length=20, null=True, blank=True)
    avatar = models.ImageField(upload_to='profile_pics/', default='profile_pics/teacherdefault.jpg', null=True, blank=True)
    profession = models.CharField(max_length=100, null=True, blank=True)
    degree = models.CharField(max_length=100, null=True, blank=True)
    wilaya = models.CharField(max_length=20, null=True, blank=True)
    university = models.CharField(max_length=100, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        return f"{self.user.first_name} {self.user.last_name}"



class Student(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    first_name =models.CharField( max_length=20, null=True, blank=True)
    last_name =models.CharField( max_length=20, null=True, blank=True)
    phone_number = models.CharField(max_length=10, null=True, blank=True)
    avatar = models.ImageField(upload_to='profile_pics/', default='profile_pics/student.jpg', null=True, blank=True)
    wilaya = models.CharField(max_length=20, null=True, blank=True)
    school_level = models.ForeignKey(SchoolLevel, on_delete=models.CASCADE, default=1)
    grade = models.ForeignKey(Grade, on_delete=models.CASCADE, default=1)
    field_of_study = models.ForeignKey(FieldOfStudy, on_delete=models.CASCADE, default=1)
    
    def __str__(self) -> str:
        return f"{self.first_name} {self.last_name}"
    
    