from django.db import models
from groups.models import FieldOfStudy
from users.models import User

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

class Deck(models.Model):
    user = models.ForeignKey("users.User", on_delete=models.CASCADE)
    title = models.CharField(max_length=200)
    description = models.TextField()
    subject = models.CharField(max_length=20, choices = subjsctChoice.choices, null=True, blank=True) 
    created_at = models.DateTimeField(auto_now_add=True)

class Flashcard(models.Model):
    deck = models.ForeignKey(Deck, on_delete=models.CASCADE, related_name='flashcards')
    front = models.TextField()
    back = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

class Deckprogress(models.Model):
    deck = models.ForeignKey(Deck, on_delete=models.CASCADE, related_name="progress")
    user = models.ForeignKey("users.User", on_delete=models.CASCADE, related_name="deck_progress")
    correct_answers = models.IntegerField(default=0)
    wrong_answers = models.IntegerField(default=0)
    total_flashcards = models.IntegerField(default=0)
    completed = models.BooleanField(default=False)