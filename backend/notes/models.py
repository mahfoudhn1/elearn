from django.db import models

from django.utils.timezone import now

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

class Note(models.Model):
    student = models.ForeignKey("users.student", on_delete=models.CASCADE)
    title = models.TextField()
    subject = models.CharField(max_length=20, choices = subjsctChoice.choices, null=True, blank=True) 
    created_at = models.DateTimeField(auto_now_add=True, blank=True, null=True)
    updated_at = models.DateTimeField(auto_now=True, blank=True, null=True)
    def __str__(self) -> str:
        return f"note from {self.student.user.username} title: {self.title} "