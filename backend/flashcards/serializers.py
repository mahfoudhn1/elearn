from rest_framework import serializers

from users.models import User
from .models import Flashcard, Deck, Deckprogress


class FlashcardSerializer(serializers.ModelSerializer):
    class Meta:
        model = Flashcard
        fields = ['id', "deck", "front", "back", "created_at"]

class DeckProgressSerializer(serializers.ModelSerializer):
    class Meta:
        model = Deckprogress
        fields = ['id', 'deck', 'user', 'correct_answers', 'wrong_answers', 'total_flashcards', 'completed']

class DeckSerializer(serializers.ModelSerializer):

    flashcards = FlashcardSerializer(many=True, read_only=True)
    progress = DeckProgressSerializer(many=True, read_only=True)

    class Meta:
        model = Deck
        fields = ['id', 'title', 'description','subject', 'created_at', 'flashcards', 'progress']
