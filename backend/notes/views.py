from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated
from .models import Note, TodoList
from .serializers import NoteSerializer, TodoSerializer
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.exceptions import NotFound
from urllib.parse import unquote

from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.exceptions import NotFound
from .models import Note
from .serializers import NoteSerializer
from urllib.parse import unquote

class NoteViewst(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = NoteSerializer

    def get_queryset(self):
        """
        Override the default queryset to filter notes by the authenticated user.
        """
        return Note.objects.filter(user=self.request.user)

    def list(self, request, *args, **kwargs):
        """
        Override the list method to filter notes by subject if provided.
        If no notes are found for the subject, return an empty list.
        """
        subject = request.query_params.get('subject', None)
        if subject:
            decoded_subject = unquote(subject)
            queryset = self.get_queryset().filter(subject=decoded_subject)
            serializer = self.get_serializer(queryset, many=True)
            return Response(serializer.data)  # Return empty list if no notes are found
        
        return super().list(request, *args, **kwargs)

    def perform_create(self, serializer):
        """
        Automatically assign the authenticated user to the note during creation.
        """
        serializer.save(user=self.request.user)

    def update(self, request, *args, **kwargs):
        """
        Override the update method to ensure only the note owner can update it.
        """
        partial = kwargs.pop('partial', False)
        instance = self.get_object()  # Get the note instance
        if instance.user != request.user:
            raise NotFound("Note not found or you do not have permission to edit it.")
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)

    def destroy(self, request, *args, **kwargs):
        """
        Override the destroy method to ensure only the note owner can delete it.
        """
        instance = self.get_object()  # Get the note instance
        if instance.user != request.user:
            raise NotFound("Note not found or you do not have permission to delete it.")
        instance.delete()
        return Response(
            {"detail": "Note deleted successfully."},
            status=status.HTTP_204_NO_CONTENT,
        )
    # @action(detail=False, methods=['get'], url_path='subject/(?P<subject>[^/.]+)')
    # def filter_bysubject(self, request, subject=None):
    #     decoded_subject = unquote(subject)
    #     queryset = Note.objects.filter(subject=decoded_subject)
    #     if not queryset.exists():
    #         raise NotFound(f"No notes found for subject '{subject}'.")
        
    #     serializer = self.get_serializer(queryset, many=True)
    #     return Response(serializer.data)
    
class TodoViewSet(viewsets.ModelViewSet):
    queryset = TodoList.objects.all()
    serializer_class = TodoSerializer
    permission_classes= [IsAuthenticated]