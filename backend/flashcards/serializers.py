from rest_framework import serializers

from users.models import User
from .models import Flashcard, FlashcardCollection


class FlashcardSerializer(serializers.ModelSerializer):
    class Meta:
        model = Flashcard
        fields = ['id', 'question', 'answer']


class FlashcardCollectionSerializer(serializers.ModelSerializer):
    flashcards = FlashcardSerializer(many=True, read_only=True)

    class Meta:
        model = FlashcardCollection
        fields = ['id', 'title', 'user', 'flashcards']

class FlashcardShareSerializer(serializers.ModelSerializer):
    shared_with = serializers.PrimaryKeyRelatedField(queryset=User.objects.all(), many=True)

    class Meta:
        model = FlashcardCollection
        fields = ['shared_with']

    def update(self, instance, validated_data):
        instance.shared_with.set(validated_data['shared_with'])
        instance.save()
        return instance
