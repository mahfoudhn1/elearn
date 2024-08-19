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
   
    avatar = models.ImageField(upload_to='profile_pics/', null=True, blank=True)
    profession = models.CharField(max_length=100, null=True, blank=True)
    degree = models.CharField(max_length=100, null=True, blank=True)
    wilaya = models.CharField(max_length=20, null=True, blank=True)
    university = models.CharField(max_length=100, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class HighschoolClass(models.Model):
    name = models.CharField(max_length=100)

class MiddleSchoolClass(models.Model):
    name = models.CharField(max_length=100)

class HighSchoolSpecialities(models.TextChoices):
    LITERATURE = 'LT', 'Literature'
    MATH = 'MT', 'Math'
    SCIENCE = 'SC', 'Science'


class SchoolLevel(models.Model):
    school_level = models.CharField(
        max_length=10,
        choices=SchoolChoice.choices,
        null=True,
        blank=True
    )

    # For Middle School - 4 classes
    middle_school_classes = models.ManyToManyField(MiddleSchoolClass, blank=True)

    # For High School - 3 subjects
    high_school_classes = models.ManyToManyField(HighschoolClass, blank=True)  # Assuming Class will represent the high school subjects


class Student(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    phone_number = models.CharField(max_length=10, null=True, blank=True)
    avatar = models.ImageField(upload_to='profile_pics/', null=True, blank=True)
    wilaya = models.CharField(max_length=20, null=True, blank=True)
    school_level = models.ForeignKey(SchoolLevel, on_delete=models.CASCADE)
    hightschool_speciality = models.CharField(max_length=10, choices=HighSchoolSpecialities.choices, null=True, blank=True)
    