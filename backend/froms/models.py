from django.db import models

from core.models import UUIDModel
class TeacherApplication(UUIDModel):
    name = models.CharField(max_length=100)
    familyName = models.CharField(max_length=100)
    phone = models.CharField(max_length=20)
    email = models.EmailField()
    wilaya = models.CharField(max_length=100)
    grade = models.CharField(max_length=50, choices=[
        ("bachelor", "ليسانس"),
        ("master", "ماستر"),
        ("phd", "دكتوراه"),
    ])
    teachingGrade = models.CharField(max_length=50, choices=[
        ("midschool", "midschool"),
        ("highschool", "highschool"),
        ("languages", "languages"),
    ], default="highschool")
    yearsOfExperience = models.CharField(max_length=50, choices=[
        ("0-5", "0 to 5 years"),
        ("5+", "more than 5 years"),
    ], default="0-5")
    subject = models.CharField(max_length=100)

    degreeCertificate = models.FileField(upload_to="certificates/")

    # Equipment
    computer = models.CharField(max_length=3, choices=[("yes", "نعم"), ("no", "لا")])
    tablet = models.CharField(max_length=3, choices=[("yes", "نعم"), ("no", "لا")])
    webcam = models.CharField(max_length=3, choices=[("yes", "نعم"), ("no", "لا")])

    # New experience fields
    onlineExperience = models.CharField(max_length=3, choices=[("نعم", "نعم"), ("لا", "لا")])
    teachingExperience = models.CharField(max_length=3, choices=[("نعم", "نعم"), ("لا", "لا")])
    privateLessons = models.CharField(max_length=3, choices=[("نعم", "نعم"), ("لا", "لا")])

    submitted_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} {self.familyName}"
