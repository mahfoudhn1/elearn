from rest_framework import serializers

from users.models import User
from .models import Flashcard, Deck, Deckprogress


from core.serializers import UUIDModelSerializer, UUIDRelatedField
class FlashcardSerializer(UUIDModelSerializer):
    class Meta:
        model = Flashcard
        fields = ['id', "deck", "front", "back", "created_at"]

class DeckProgressSerializer(UUIDModelSerializer):
    class Meta:
        model = Deckprogress
        fields = ['id', 'correct_answers', 'wrong_answers', 'total_flashcards', 'completed']

class DeckSerializer(UUIDModelSerializer):

    flashcards = FlashcardSerializer(many=True, read_only=True)
    progress = DeckProgressSerializer(many=True, read_only=True)

    class Meta:
        model = Deck
        fields = ['id', 'title', 'description','subject', 'created_at', 'flashcards', 'progress']
