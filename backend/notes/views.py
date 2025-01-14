from django.shortcuts import render
from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated
from .models import Note
from .serializers import NoteSerializer
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.exceptions import NotFound
from urllib.parse import unquote



class NoteViewst(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = NoteSerializer

    def get_queryset(self):
        return Note.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def create(self, request, *args, **kwargs):

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(user=request.user)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
    
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)  # Check if it's a partial update (PATCH)
        instance_id = kwargs.get('pk')  # Get the ID from the URL
        try:
            instance = Note.objects.get(id=instance_id, user=request.user)  # Ensure the note belongs to the user
        except Note.DoesNotExist:
            raise NotFound("Note not found.")
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    def destroy(self, request, *args, **kwargs):
        instence_id = kwargs.get('pk') 
        try:
            instance = Note.objects.get(id=instence_id, user=request.user)
        except Note.DoesNotExist:
            raise NotFound("Note not found.")
        instance.delete()
        return Response(
            {"detail": "Note deleted successfully."},
            status=status.HTTP_204_NO_CONTENT,
        )
    
    @action(detail=False, methods=['get'], url_path='subject/(?P<subject>.+)')
    def filter_bysubject(self, request, subject=None):
        decoded_subject = unquote(subject)

        queryset = Note.objects.filter(subject=decoded_subject)
        if not queryset.exists():
            raise NotFound(f"No notes found for subject '{subject}'.")
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)