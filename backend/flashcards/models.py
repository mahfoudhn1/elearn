from django.db import models
from groups.models import FieldOfStudy
from users.models import User


class FlashcardCollection(models.Model):
    title = models.CharField(max_length=255)
    user = models.ForeignKey(User, verbose_name=("users"), on_delete=models.CASCADE)
    shared_with = models.ManyToManyField(User, related_name='shared_collections', blank=True)
    field_of_study = models.ForeignKey(FieldOfStudy, verbose_name=("fields_of_study"), on_delete=models.CASCADE)
    def __str__(self):
        return self.title


class Flashcard(models.Model):
    collection = models.ForeignKey(FlashcardCollection, related_name='flashcards', on_delete=models.CASCADE)
    question = models.TextField()
    answer = models.TextField()

    def __str__(self):
        return self.question
