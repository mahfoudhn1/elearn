from django.db import models
from django.core.validators import RegexValidator


from core.models import UUIDModel
class StudentForm(UUIDModel):
    ROLE_CHOICES = [
        ('student', 'طالب'),
        ('parent', 'ولي أمر'),
    ]
    EDUCATION_LEVEL_CHOICES = [
        ('middle', 'متوسط'),
        ('high', 'ثانوي'),
        ('languages', 'دراسات لغات'),
    ]

    role = models.CharField("الدور", max_length=10, choices=ROLE_CHOICES, default='student')
    name = models.CharField("الاسم", max_length=100)
    family_name = models.CharField("اللقب", max_length=100)
    phone_number = models.CharField(
        "رقم الهاتف",
        max_length=20,
        validators=[
            RegexValidator(regex=r'^\+?\d{8,15}')
        ])
    class Meta:
        verbose_name = "استمارة الطالب"
        verbose_name_plural = "استمارات الطلاب"

    def __str__(self):
        return f"{self.name} {self.family_name}"

    education_level = models.CharField(
        "المستوى الدراسي",
        max_length=50,
        choices=EDUCATION_LEVEL_CHOICES,
        blank=True, null=True
    )
    year = models.CharField("السنة الدراسية", max_length=10, blank=True, null=True)
    branch = models.CharField("الشعبة", max_length=50, blank=True, null=True)
    language_choice = models.CharField("اللغة", max_length=50, blank=True, null=True)
    subjects = models.JSONField("المواد", default=list)


    class Meta:
        verbose_name = "استمارة الطالب"
        verbose_name_plural = "استمارات الطلاب"

    def __str__(self):
        return f"{self.name} {self.family_name}"
