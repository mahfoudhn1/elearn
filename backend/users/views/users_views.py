from django.forms import ValidationError
from django.contrib.auth import get_user_model
from django.core.exceptions import PermissionDenied
from rest_framework.exceptions import NotFound
from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from users.models import FieldOfStudy, Grade, User, Teacher, Student
from users.serializers import UserSerializer, TeacherSerializer, StudentSerializer
from ..filters import TeacherFilter
from django_filters.rest_framework import DjangoFilterBackend

from rest_framework.decorators import action


class UserViewSet(viewsets.ModelViewSet):
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Ensure users can only access their own data
        return get_user_model().objects.filter(id=self.request.user.id)

    def get_object(self):
        # Always return the currently authenticated user
        return self.request.user

    def create(self, request, *args, **kwargs):
        # Handle user creation
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        # Create a Teacher or Student profile based on the role
        role = request.data.get('role')
        if role == 'teacher':
            Teacher.objects.get_or_create(user=user)
        elif role == 'student':
            Student.objects.get_or_create(user=user)

        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        # Handle user updates
        self.object = self.get_object()
        old_role = self.object.role
        new_role = request.data.get('role', self.object.role)

        # Validate the new role
        if new_role not in ['teacher', 'student']:
            raise ValidationError({"detail": "Invalid role provided. Role must be 'teacher' or 'student'."})

        # Update the user
        serializer = self.get_serializer(self.object, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        # If the role changed, create the corresponding profile
        if old_role != new_role:
            if new_role == 'teacher':
                Teacher.objects.get_or_create(user=self.object)

            elif new_role == 'student':
                Student.objects.get_or_create(user=self.object)

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
    permission_classes = [IsAuthenticated]
    def perform_create(self, serializer):
        user = self.request.user

        teacher, created = Teacher.objects.get_or_create(user=user)

        if not created:
            serializer.update(instance=teacher, validated_data=self.request.data)
        else:
            # Save a new Teacher instance
            serializer.save(user=user)

    
    def update(self, request, *args, **kwargs):
        user = request.user

        try:
            teacher = Teacher.objects.get(user=user)
        except Teacher.DoesNotExist:
            return Response({"error": "Teacher profile not found"}, status=status.HTTP_404_NOT_FOUND)

        print("Request Data:", request.data) 

        serializer = self.get_serializer(teacher, data=request.data, partial=True)
        try:
            serializer.is_valid(raise_exception=True)
        except Exception as e:
            print("Serializer Validation Error:", e)  # Debugging
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=["get"])
    def me(self, request):

        try:
            teacher = Teacher.objects.get(user=request.user)
            serializer = self.get_serializer(teacher)
            return Response(serializer.data)
        except Teacher.DoesNotExist:
            return Response(
                {"error": "Teacher profile not found"}, status=status.HTTP_404_NOT_FOUND
            )
class StudentViewSet(viewsets.ModelViewSet):
    queryset = Student.objects.all()
    serializer_class = StudentSerializer
    permission_classes = [IsAuthenticated]
    
    def update(self, request, *args, **kwargs):
        user = request.user

        try:
            student = Student.objects.get(user=user)
        except Student.DoesNotExist:
            return Response({"error": "Student profile not found"}, status=status.HTTP_404_NOT_FOUND)

        print("Request Data:", request.data)  # Debugging

        serializer = self.get_serializer(student, data=request.data, partial=True)

        if serializer.is_valid():
            print('Serializer is valid')
            print("Data being saved:", serializer.validated_data)  # Debugging
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        
        print('Serializer errors:', serializer.errors)  # Debugging
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)



    @action(detail=False, methods=["get"])
    def me(self, request):

        try:
            student = Student.objects.get(user=request.user)
            serializer = self.get_serializer(student)
            return Response(serializer.data)
        except Teacher.DoesNotExist:
            return Response(
                {"error": "student profile not found"}, status=status.HTTP_404_NOT_FOUND
            )