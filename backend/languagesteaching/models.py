from django.db import models

from users.models import Student

class Language(models.Model):
    name = models.CharField(max_length=100, unique=True)
    country_code = models.CharField(max_length=2, default='GB')  
    description = models.TextField(blank=True, null=True)

    def __str__(self):
        return self.name

class LanguageLevel(models.Model):

    name = models.CharField(max_length=50, unique=True)
    
    description = models.TextField(blank=True, null=True)

    def __str__(self):
        return self.name
    
class StudentLanguageProficiency(models.Model):
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='language_proficiencies')
    language = models.ForeignKey(Language, on_delete=models.CASCADE, related_name='student_proficiencies')
    level = models.ForeignKey(LanguageLevel, on_delete=models.PROTECT, related_name='student_language_levels') # PROTECT prevents deletion of a level if it's in use
    score = models.IntegerField(default=0)

    class Meta:

        unique_together = ('student', 'language') 

    def __str__(self): 
        return f"{self.student.user.first_name}'s {self.language.name} - {self.level.name}"

class Question(models.Model):
    QUESTION_TYPES = [
        ('multiple_choice', 'Multiple Choice'),
        ('fill_blank', 'Fill in the Blank'),
        ('true_false', 'True/False'),
    ]
    
    language = models.ForeignKey(Language, on_delete=models.CASCADE)
    # level = models.ForeignKey(LanguageLevel, on_delete=models.CASCADE)
    text = models.TextField()
    question_type = models.CharField(max_length=20, choices=QUESTION_TYPES)
    options = models.JSONField(blank=True, null=True) 
    correct_answer = models.TextField()
    explanation = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"{self.language.name} : {self.text[:50]}..."
