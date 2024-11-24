# flashcards/views.py

from rest_framework import viewsets
from .models import Flashcard, FlashcardCollection
from .serializers import FlashcardSerializer, FlashcardCollectionSerializer, FlashcardShareSerializer
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q  
from rest_framework.response import Response
from rest_framework import status


class FlashcardViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = Flashcard.objects.all()
    serializer_class = FlashcardSerializer


class FlashcardCollectionViewSet(viewsets.ModelViewSet):
    serializer_class = FlashcardCollectionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        # Fetch collections owned by the user or shared with the user
        return FlashcardCollection.objects.filter(Q(user=user) | Q(shared_with=user))

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def perform_update(self, serializer):
        serializer.save()

class FlashcardShareViewSet(viewsets.ModelViewSet):
    queryset = FlashcardCollection.objects.all()
    serializer_class = FlashcardShareSerializer
    permission_classes = [IsAuthenticated]

    def update(self, request, *args, **kwargs):
        collection = self.get_object()

        # Only the owner of the collection can share it
        if collection.user != request.user:
            return Response({"detail": "Not authorized to share this collection"}, status=status.HTTP_403_FORBIDDEN)

        return super().update(request, *args, **kwargs)
