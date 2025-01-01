# flashcards/views.py

from rest_framework import viewsets, permissions
from .models import Flashcard, Deck, Deckprogress
from .serializers import FlashcardSerializer, DeckSerializer, DeckProgressSerializer
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Q
from rest_framework.exceptions import NotAuthenticated, NotFound

class isOwnerOrReadOnly(permissions.BasePermission):
     def has_object_permission(self, request, view, obj):
 
        if obj.visibility == 'public' and request.method in permissions.SAFE_METHODS:
            return True

        return obj.user == request.user
    
class DeckViewSet(viewsets.ModelViewSet):
    queryset = Deck.objects.all()
    serializer_class = DeckSerializer
    permission_classes = [IsAuthenticated, isOwnerOrReadOnly]
    
    def get_queryset(self):
        return Deck.objects.filter(
            Q(visibility='public') | Q(user=self.request.user)
        )

    def perform_create(self, serializer):
        if not self.request.user.is_authenticated:
            raise NotAuthenticated("User must be authenticated to create a deck.")
        

        deck = serializer.save(user=self.request.user)
        
        Deckprogress.objects.create(
        user=self.request.user,
        deck=deck,
        total_flashcards=0,
        correct_answers=0,
        wrong_answers=0,
        completed=False
    )

    
class FlashcardViewSet(viewsets.ModelViewSet):
    queryset = Flashcard.objects.all()
    serializer_class = FlashcardSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return self.queryset.filter(deck__user=self.request.user)
    
    def perform_create(self, serializer):
        flashcard = serializer.save()
        
        deck_progress = Deckprogress.objects.filter(deck=flashcard.deck).first()
        if deck_progress:
            deck_progress.total_flashcards += 1
            deck_progress.save()

    def destroy(self, request, *args, **kwargs):
        instence_id = kwargs.get('pk') 
        try:
            instance = Flashcard.objects.get(id=instence_id)
        except Flashcard.DoesNotExist:
            raise NotFound("Note not found.")
        instance.delete()
        return Response(
            {"detail": "Note deleted successfully."},
            status=status.HTTP_204_NO_CONTENT,
        )
    def update(self, request, *args, **kwargs):

        instance_id = kwargs.get('pk')  
        try:
            instance = Flashcard.objects.get(id=instance_id, deck__user=self.request.user)
        except Flashcard.DoesNotExist:
            raise NotFound("Flashcard not found or you don't have permission to update it.")

        serializer = self.get_serializer(instance, data=request.data, partial=False)  # Use partial=True for partial updates
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(serializer.data, status=status.HTTP_200_OK)
        
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

    @action(detail=True, methods=['PUT'])
    def update_progress(self, request, pk=None):
        progress = self.get_object()
        
        correct_total = request.data.get('correct_total')
        wrong_total = request.data.get('wrong_total')
        
        if correct_total is None or wrong_total is None:
            return Response({"error": "Both 'correct_total' and 'wrong_total' are required."}, status=status.HTTP_400_BAD_REQUEST)


        progress.correct_answers = correct_total
        progress.wrong_answers = wrong_total


        if progress.correct_answers == progress.total_flashcards and progress.wrong_answers == 0:
            progress.completed = True
        else:
            progress.completed = False

        progress.save()

        return Response({
            "correct_answers": progress.correct_answers,
            "wrong_answers": progress.wrong_answers,
            "completed": progress.completed
        }, status=status.HTTP_200_OK)
