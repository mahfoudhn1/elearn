from django.forms import ValidationError
from django.contrib.auth import get_user_model
from django.core.exceptions import PermissionDenied
from rest_framework.exceptions import NotFound
from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from users.models import User, Teacher, Student
from users.serializers import UserSerializer, TeacherSerializer, StudentSerializer
from ..filters import TeacherFilter
from django_filters.rest_framework import DjangoFilterBackend


class UserViewSet(viewsets.ModelViewSet):
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return get_user_model().objects.filter(id=self.request.user.id)

    def get_object(self):
        return self.request.user

    def update(self, request, *args, **kwargs):
        self.object = self.get_object()
        new_role = request.data.get('role', self.object.role)

        if new_role not in ['teacher', 'student']:
            raise ValidationError({"detail": "Invalid role provided."})

        data = {'role': new_role}
        serializer = self.get_serializer(self.object, data=data, partial=True)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)


        if new_role == 'teacher':
            if not Teacher.objects.filter(user=self.object).exists():
                Teacher.objects.create(
                    user=self.object,
                    first_name=self.object.first_name,
                    last_name=self.object.last_name
                )
        elif new_role == 'student':
            if not Student.objects.filter(user=self.object).exists():
                Student.objects.create(
                    user=self.object,
                    firstName=self.object.firstName,
                    lastName=self.object.secondName
                )

        return Response(serializer.data)

class TeacherProfileView(viewsets.ModelViewSet):

    permission_classes = [IsAuthenticated]

    def list(self, request, *args, **kwargs):
        user = request.user
        try:
            teacher = Teacher.objects.get(user=user)
        except Teacher.DoesNotExist:
            raise NotFound(detail="Teacher profile not found for this user.")
        serializer = TeacherSerializer(teacher)
        return Response(serializer.data)
    def update(self, request, *args, **kwargs):
        user = request.user
        teacher = Teacher.objects.get(pk=kwargs['pk'])
        
        if teacher.user != user:
            raise PermissionDenied(detail="You do not have permission to edit this profile.")

        serializer = TeacherSerializer(teacher, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(serializer.data)
    

class TeacherViewSet(viewsets.ModelViewSet):
    queryset = Teacher.objects.all()
    serializer_class = TeacherSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_class = TeacherFilter
    
    def perform_create(self, serializer):
        user = self.request.user

        teacher, created = Teacher.objects.get_or_create(user=user)

        if not created:
            serializer.update(instance=teacher, validated_data=self.request.data)
        else:
            # Save a new Teacher instance
            serializer.save(user=user)

class StudentViewSet(viewsets.ModelViewSet):
    serializer_class = StudentSerializer
    permission_classes = [IsAuthenticated]
