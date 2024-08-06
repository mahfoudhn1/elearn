from django.shortcuts import render
from rest_framework.response import Response

from rest_framework import viewsets, permissions
from rest_framework import status

from .serializers import * 
from .models import *
from users.models import Student, Teacher

class GroupViewset(viewsets.ModelViewSet):

    queryset = Group.objects.all()
    serializer_class = GroupSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        request = self.request
        # Ensure user is a teacher
        if request.user.role != 'teacher':
            raise serializers.ValidationError("Only teachers can create groups.")

        try:
            user = request.user
            teacher = Teacher.objects.get(user=user)
        except Teacher.DoesNotExist:
            raise serializers.ValidationError("User does not have an associated Teacher instance.")

        # Save the group with the teacher as admin
        serializer.save(admin=teacher)

class StudentGroupRequestViewSet(viewsets.ModelViewSet):
    queryset = StudentGroupRequest.objects.all()
    serializer_class = StudentGroupRequestSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        if self.request.user.role != 'student':
            raise serializers.ValidationError("Only students can send group join requests.")

        user = self.request.user
        try:
            student = Student.objects.get(user=user)
        except Student.DoesNotExist:
            raise serializers.ValidationError("User does not have an associated Student instance.")

        # Check if the student is subscribed to the teacher associated with the group
        group_id = self.request.data.get('group')
        if not group_id:
            raise serializers.ValidationError("Group ID must be provided.")

        try:
            group = Group.objects.get(id=group_id)
            teacher = group.admin
            subscription = Subscription.objects.filter(student=student, teacher=teacher, is_active=True).exists()
            if not subscription:
                raise serializers.ValidationError("You must be subscribed to the teacher to join their group.")
        except Group.DoesNotExist:
            raise serializers.ValidationError("Group does not exist.")

        serializer.save(student=student)

class TeacherGroupRequestViewSet(viewsets.ModelViewSet):
    queryset = StudentGroupRequest.objects.all()
    serializer_class = StudentGroupRequestSerializer
    permission_classes = [permissions.IsAuthenticated]

    def update(self, request, *args, **kwargs):
        if request.user.role != 'teacher':
            return Response({"detail": "Only teachers can manage group join requests."}, status=status.HTTP_403_FORBIDDEN)

        request_instance = self.get_object()

        if 'accept' in request.data:
            request_instance.is_accepted = True
            request_instance.is_rejected = False

            try:
                group = request_instance.group
                student = request_instance.student

                # Retrieve the Teacher instance associated with the current user
                try:
                    teacher = Teacher.objects.get(user=request.user)
                except Teacher.DoesNotExist:
                    return Response({"detail": "User does not have an associated Teacher instance."}, status=status.HTTP_400_BAD_REQUEST)

                # Check if the teacher is the admin of the group
                if group.admin != teacher:
                    return Response({"detail": "You are not the admin of this group."}, status=status.HTTP_403_FORBIDDEN)

                # Add the student to the group
                group.students.add(student)
                group.save()

            except Group.DoesNotExist:
                return Response({"detail": "Group does not exist."}, status=status.HTTP_400_BAD_REQUEST)
            except Student.DoesNotExist:
                return Response({"detail": "Student does not exist."}, status=status.HTTP_400_BAD_REQUEST)
            except Exception as e:
                return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        elif 'reject' in request.data:
            request_instance.is_rejected = True
            request_instance.is_accepted = False

        request_instance.save()
        serializer = self.get_serializer(request_instance)
        return Response(serializer.data, status=status.HTTP_200_OK)
