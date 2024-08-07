from django.shortcuts import render
from rest_framework import viewsets, status
from .models import *
from .serializers import *

from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from django.core.exceptions import PermissionDenied

from users.models import Teacher



class PrivateSessionViewSet(viewsets.ModelViewSet):
    queryset = PrivetSession.objects.all()
    serializer_class = PrivetSessionSerializer


class PrivateSessionRequestViewSet(viewsets.ModelViewSet):
    queryset = PrivateSessionRequest.objects.all()
    serializer_class = PrivateSessionRequestSerializer

    def perform_create(self, serializer):
        # Get the current user (student) from the request
        student = self.request.user
        if not hasattr(student, 'student'):
            return Response({'detail': 'User is not a student.'}, status=status.HTTP_400_BAD_REQUEST)

        # Extract the teacher ID from the request data
        teacher_id = self.request.data.get('teacher')
        if not teacher_id:
            return Response({'detail': 'Teacher ID is required.'}, status=status.HTTP_400_BAD_REQUEST)

        # Validate and retrieve the Teacher instance
        try:
            teacher = Teacher.objects.get(id=teacher_id)
        except Teacher.DoesNotExist:
            return Response({'detail': 'Teacher not found.'}, status=status.HTTP_404_NOT_FOUND)

        # Save the new PrivateSessionRequest with the current user as the student and the provided teacher
        serializer.save(student=student, teacher=teacher)

    def perform_update(self, serializer):
        instance = serializer.save()
        
        # Ensure that the request is made by a teacher
        user = self.request.user
        if user.role != 'teacher':
            raise PermissionDenied("Only teachers can update session requests.")

        # Check if the user is the specific teacher associated with the request
        if instance.teacher.user != user:
            raise PermissionDenied("You are not authorized to update this request.")

        # Create a PrivateSession if the status has been updated to 'accepted'
        if instance.status == 'accepted':
            PrivetSession.objects.create(
                student=instance.student,
                teacher=instance.teacher,
                session_date=instance.session_date,
                paid=False,  # You can adjust this as needed
                notes=instance.notes
            )
            instance.delete()