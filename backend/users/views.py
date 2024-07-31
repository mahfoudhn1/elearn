from rest_framework import viewsets, status
from rest_framework.response import Response
from .models import User, Teacher, Student, Module, Grade, Speciality
from .serializers import  LoginSerializer, UserSerializer, TeacherSerializer, StudentSerializer, ModuleSerializer, GradeSerializer, SpecialitySerializer, RegisterSerializer
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from django.contrib.auth import get_user_model
from rest_framework.permissions import IsAuthenticated, AllowAny

class MyTokenObtainPairView(TokenObtainPairView):
    # Optionally customize the behavior
    pass

class MyTokenRefreshView(TokenRefreshView):
    # Optionally customize the behavior
    pass

class UserViewSet(viewsets.ModelViewSet):
    queryset = get_user_model().objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [IsAuthenticated]
   

class RegisterView(viewsets.ModelViewSet):
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]  

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            return Response({
                "user": serializer.data,
                "message": "User created successfully."
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    

class TeacherViewSet(viewsets.ModelViewSet):
    queryset = Teacher.objects.all()
    serializer_class = TeacherSerializer
    permission_classes = [IsAuthenticated]

class StudentViewSet(viewsets.ModelViewSet):
    queryset = Student.objects.all()
    serializer_class = StudentSerializer
    permission_classes = [IsAuthenticated]

class ModuleViewSet(viewsets.ModelViewSet):
    queryset = Module.objects.all()
    serializer_class = ModuleSerializer
    permission_classes = [IsAuthenticated]

class GradeViewSet(viewsets.ModelViewSet):
    queryset = Grade.objects.all()
    serializer_class = GradeSerializer
    permission_classes = [IsAuthenticated]

class SpecialityViewSet(viewsets.ModelViewSet):
    queryset = Speciality.objects.all()
    serializer_class = SpecialitySerializer
    permission_classes = [IsAuthenticated]

class AuthViewSet(viewsets.GenericViewSet):
    serializer_class = LoginSerializer
    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        return Response({
            'user': UserSerializer(user).data,
            'token': serializer.data['token']
        }, status=status.HTTP_200_OK)

