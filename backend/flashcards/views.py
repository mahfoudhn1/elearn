# flashcards/views.py

from rest_framework import viewsets, permissions
from .models import Flashcard, Deck, Deckprogress
from .serializers import FlashcardSerializer, DeckSerializer, DeckProgressSerializer
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status

class isOwnerOrReadOnly(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return obj.user == request.user
    
class Deckviewset(viewsets.ModelViewSet):
    queryset = Deck.objects.all()
    serializer_class = DeckSerializer
    permission_classes = [permissions.IsAuthenticated, isOwnerOrReadOnly]
    
    def get_queryset(self):
        return self.queryset.filter(deck__user=self.request.user)

class FlashcardViewSet(viewsets.ModelViewSet):
    queryset = Flashcard.objects.all()
    serializer_class = FlashcardSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return self.queryset.filter(deck__user=self.request.user)

class DeckProgressViewset(viewsets.ModelViewSet):
    queryset = Deckprogress.objects.all()
    serializer_class = DeckProgressSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return self.queryset.filter(user=self.request.user)

    def perform_create(self, serializer):
        deck = serializer.validated_data['deck']
        total_flashcards = Flashcard.objects.filter(deck=deck).count()
        serializer.save(user=self.request.user, total_flashcards=total_flashcards)

    @action(detail=True, methods=['post'])
    def update_progress(self, request, pk=None):
          
        progress = self.get_object()
        action_type = request.data.get('action')

        if action_type not in ['correct', 'wrong']:
            return Response({"error": "Invalid action type"}, status=status.HTTP_400_BAD_REQUEST)

        if action_type == 'correct':
            progress.correct_answers += 1
        elif action_type == 'wrong':
            progress.wrong_answers += 1

        if (progress.correct_answers + progress.wrong_answers) == progress.total_flashcards:
            progress.completed = True

        progress.save()

        return Response({
            "correct_answers": progress.correct_answers,
            "wrong_answers": progress.wrong_answers,
            "completed": progress.completed
        }, status=status.HTTP_200_OK)