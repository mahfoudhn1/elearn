from django.http import HttpResponse, HttpResponseRedirect
from rest_framework import viewsets, status
from rest_framework.response import Response
from .models import User, Teacher, Student, Module, Grade, Speciality
from .serializers import AuthSerializer, LoginSerializer, UserSerializer, TeacherSerializer, StudentSerializer, ModuleSerializer, GradeSerializer, SpecialitySerializer, RegisterSerializer
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from django.contrib.auth import get_user_model
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.conf import settings
from google.oauth2 import id_token
import requests as req
from google.auth.transport import requests
import logging
from rest_framework_simplejwt.tokens import RefreshToken

import json


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
    

logger = logging.getLogger(__name__)


def get_tokens_for_user(user):
    refresh = RefreshToken.for_user(user)
    return {
        'refresh': str(refresh),
        'access': str(refresh.access_token),
    }

class GoogleOAuthCallbackViewSet(viewsets.ViewSet):
    def list(self, request, *args, **kwargs):
        code = request.query_params.get('code')
        if not code:
            return Response({'error': 'Authorization code missing'}, status=status.HTTP_400_BAD_REQUEST)

        token_url = 'https://oauth2.googleapis.com/token'
        data = {
            'code': code,
            'client_id': settings.GOOGLE_CLIENT_ID,
            'client_secret': settings.GOOGLE_CLIENT_SECRET,
            'redirect_uri': 'http://localhost:8000/api/auth/callback/google/',
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

            User = get_user_model()
            user, created = User.objects.get_or_create(email=user_email)
            if created:
                # Optionally handle new user creation here
                pass

            tokens = get_tokens_for_user(user)
            tokens = get_tokens_for_user(user)
            response = HttpResponseRedirect('http://localhost:3000')

            response.set_cookie('access_token', tokens['access'], httponly=True, secure=False)
            response.set_cookie('refresh_token', tokens['refresh'], httponly=True, secure=False)

            return response

        except ValueError as e:
            logger.error(f"Token verification failed: {e}")
            return Response({'error': 'Token verification failed'}, status=status.HTTP_400_BAD_REQUEST)

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