from django.http import HttpResponse, HttpResponseRedirect
from rest_framework import viewsets, status
from rest_framework.response import Response
from .models import User, Teacher, Student
from .serializers import AuthSerializer, LoginSerializer, UserSerializer, TeacherSerializer, StudentSerializer, RegisterSerializer
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from django.contrib.auth import get_user_model
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.conf import settings
from google.oauth2 import id_token
import requests as req
from google.auth.transport import requests
import logging
from rest_framework_simplejwt.tokens import RefreshToken
from django.shortcuts import redirect
from rest_framework.exceptions import NotFound
from django_filters.rest_framework import DjangoFilterBackend
from .filters import TeacherFilter
from django.core.exceptions import PermissionDenied
import json


class MyTokenObtainPairView(TokenObtainPairView):
    # Optionally customize the behavior
    pass

class MyTokenRefreshView(TokenRefreshView):
    # Optionally customize the behavior
    pass

class UserViewSet(viewsets.ModelViewSet):
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return get_user_model().objects.filter(id=self.request.user.id)

    def get_object(self):
        return self.request.user

    def update(self, request, *args, **kwargs):
        self.object = self.get_object()  # Get the authenticated user
        
        # Create a data dictionary with the fields you want to update
        data = {
            'role': request.data.get('role', self.object.role),  # Update only the role, keep the existing values for others
        }

        serializer = self.get_serializer(self.object, data=data, partial=True)  # Use partial=True to allow partial updates
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
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


class RegisterView(viewsets.ModelViewSet):
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]  

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            if user.role == 'teacher':
                Teacher.objects.create(user=user)
            elif user.role == 'student':
                Student.objects.create(user=user)

            return Response({
                "user": serializer.data,
                "message": "User created successfully."
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    

logger = logging.getLogger(__name__)


def get_tokens_for_user(user):
    refresh = RefreshToken.for_user(user)
    return {
        'refresh': str(refresh),
        'access': str(refresh.access_token),
    }

class GoogleOAuthCallbackViewSet(viewsets.ViewSet):
    def create(self, request, *args, **kwargs):
        code = request.data.get('code')
        print(code)
        if not code:
            return Response({'error': 'Authorization code missing'}, status=status.HTTP_400_BAD_REQUEST)

        token_url = 'https://oauth2.googleapis.com/token'
        data = {
            'code': code,
            'client_id': settings.GOOGLE_CLIENT_ID,
            'client_secret': settings.GOOGLE_CLIENT_SECRET,
            'redirect_uri': 'http://localhost:3000/api/auth/google/callback/',
            'grant_type': 'authorization_code',
        }
        try:
            response = req.post(token_url, data=data)
            response.raise_for_status()
            response_data = response.json()

        except req.exceptions.RequestException as e:
            logger.error(f"Token exchange failed: {e}")
            return Response({'error': 'Failed to exchange authorization code for tokens'}, status=status.HTTP_400_BAD_REQUEST)

        access_token = response_data.get('id_token')
        if not access_token:
            return Response({'error': 'Access token not found in response'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            id_info = id_token.verify_oauth2_token(access_token, requests.Request(), settings.GOOGLE_CLIENT_ID)
            user_email = id_info.get('email')
            user_name = id_info.get('name', '')
            profile_picture = id_info.get('picture', '')
            
            names = user_name.split(' ', 1)
            first_name = names[0]
            last_name = names[1] if len(names) > 1 else ''
            username = user_email.split('@')[0]
            User = get_user_model()
            user, created = User.objects.get_or_create(email=user_email )
            
            if created:
                user.username = username
                user.first_name = first_name
                user.last_name = last_name
                user.avatar = profile_picture
                user.save()

            tokens = get_tokens_for_user(user)
            response = HttpResponse()

            response.set_cookie('access_token', tokens['access'], httponly=True, secure=False)
            response.set_cookie('refresh_token', tokens['refresh'], httponly=True, secure=False)
            
            response_data = {
                'user': UserSerializer(user).data,
                'message': 'Authentication successful'
            }
            
            response.content = json.dumps(response_data)
            response['Content-Type'] = 'application/json'
            
            return response

        except ValueError as e:
            logger.error(f"Token verification failed: {e}")
            return Response({'error': 'Token verification failed'}, status=status.HTTP_400_BAD_REQUEST)


class TeacherViewSet(viewsets.ModelViewSet):
    queryset = Teacher.objects.all()
    serializer_class = TeacherSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_class = TeacherFilter


class StudentViewSet(viewsets.ModelViewSet):
    queryset = Student.objects.all()
    serializer_class = StudentSerializer
    permission_classes = [IsAuthenticated]


class AuthViewSet(viewsets.GenericViewSet):
    serializer_class = LoginSerializer
    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']

        # Generate tokens
        tokens = get_tokens_for_user(user)
        # Create the response
        response = HttpResponse()
        
        # Set cookies
        response.set_cookie(
            'access_token',
            tokens['access'],
            httponly=True,
            secure= False,  # Use secure cookies if HTTPS is enabled
        )
        response.set_cookie(
            'refresh_token',
            tokens['refresh'],
            httponly=True,
            secure= False,
        )
        
        # Optionally include user data in the response body
        response_data = {
            'user': UserSerializer(user).data,
            'message': 'Authentication successful'
        }
        response.content = json.dumps(response_data)
        response['Content-Type'] = 'application/json'

        return response
    

class LogoutViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def create(self, request):
        # Perform logout logic here
        response.delete_cookie('access_token')
        response.delete_cookie('refresh_token')
        response = Response({'message': 'Logged out successfully'})
        return response
