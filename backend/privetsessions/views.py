from django.shortcuts import render
from rest_framework import viewsets, status
from .models import *
from .serializers import *

from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from django.core.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated

from users.models import Teacher, Student



class PrivateSessionViewSet(viewsets.ModelViewSet):
    queryset = PrivetSession.objects.all()
    serializer_class = PrivetSessionSerializer


class PrivateSessionRequestViewSet(viewsets.ModelViewSet):
    queryset = PrivateSessionRequest.objects.all()
    serializer_class = PrivateSessionRequestSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        # Get the current user (student) from the request
        user = self.request.user
        student = Student.objects.get(user = user)
 
        if not hasattr(user, 'student'):
            return Response({'detail': 'User is not a student.'}, status=status.HTTP_400_BAD_REQUEST)

        # Extract the teacher ID from the request data
        teacher_id = self.request.data.get('teacher')
        print(self.request.data)
        if not teacher_id:
            return Response({'detail': 'Teacher ID is required.'}, status=status.HTTP_400_BAD_REQUEST)

        # Validate and retrieve the Teacher instance
        try:
            teacher = Teacher.objects.get(id=teacher_id)
        except teacher.DoesNotExist:
            return Response({'detail': 'Teacher not found.'}, status=status.HTTP_404_NOT_FOUND)

        print(student)
        # Save the new PrivateSessionRequest with the current user as the student and the provided teacher
        private_session_request = serializer.save(student=student, teacher=teacher)
        print(f"Saved PrivateSessionRequest: {private_session_request}")

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