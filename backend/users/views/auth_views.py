from datetime import timedelta
from django.utils import timezone
from django.http import HttpResponse, HttpResponseRedirect
from django.core.mail import send_mail
from django.conf import settings
from django.urls import reverse
import logging
import json
import os
from tokenize import TokenError
from rest_framework import viewsets, status
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from users.views.emailverificationview import send_verification_email
from users.utils import verify_captcha
from users.serializers import LoginSerializer, RegisterSerializer, UserSerializer
from users.models import User
from django.db import IntegrityError


logger = logging.getLogger(__name__)


def get_tokens_for_user(user):
    refresh = RefreshToken.for_user(user)
    return {
        'refresh': str(refresh),
        'access': str(refresh.access_token),
    }


class MyTokenObtainPairView(TokenObtainPairView):
    pass

class MyTokenRefreshView(TokenRefreshView):
    permission_classes = [AllowAny]  

    def post(self, request):
        old_refresh_token = request.COOKIES.get('refresh_token') or request.data.get("refreshToken")
        
        if not old_refresh_token:
            return Response({'error': 'Refresh token not provided'}, status=400)
        
        try:
            old_token = RefreshToken(old_refresh_token)
            user_id = old_token.payload.get('user_id')
            if not user_id:
                return Response({'error': 'Token contained no recognizable user identification'}, status=400)
            
            try:
                user = User.objects.get(id=user_id)
            except User.DoesNotExist:
                return Response({'error': 'User not found'}, status=400)
            
            new_refresh = RefreshToken.for_user(user)
            new_access_token = str(new_refresh.access_token)
            new_refresh_token = str(new_refresh)
            access_token_expiry = timezone.now() + timedelta(minutes=15)
            refresh_token_expiry = timezone.now() + timedelta(days=7)

            return Response({
                'message': 'Token refreshed successfully',
                'access_token': new_access_token,
                'refresh_token': new_refresh_token,
                'access_token_expiry': access_token_expiry.isoformat(),
                'refresh_token_expiry': refresh_token_expiry.isoformat(),
            })

        except TokenError as e:
            return Response({'error': str(e)}, status=400)
        except Exception as e:
            print(f"Error refreshing token: {str(e)}")
            return Response({'error': 'Invalid refresh token'}, status=400)
        
class AuthViewSet(viewsets.GenericViewSet):
    serializer_class = LoginSerializer
    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):
        captcha_token = request.data.get("captcha")
        if not verify_captcha(captcha_token):
            return Response({"error": "Invalid CAPTCHA"}, status=status.HTTP_400_BAD_REQUEST)
        
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']

        if not user.email_verified:
            return Response(
                {"error": "Email not verified. Please check your email for verification link."},
                status=status.HTTP_403_FORBIDDEN
            )

        tokens = get_tokens_for_user(user)
        response = HttpResponse()
        
        response.set_cookie(
            'access_token',
            tokens['access'],
            httponly=True,
            secure=False,
        )
        response.set_cookie(
            'refresh_token',
            tokens['refresh'],
            httponly=True,
            secure=False,
        )
        
        response_data = {
            'user': UserSerializer(user).data,
            'message': 'Authentication successful'
        }
        response.content = json.dumps(response_data)
        response['Content-Type'] = 'application/json'

        return response
 
class RegisterView(viewsets.ModelViewSet):
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]  

    def create(self, request, *args, **kwargs):
        captcha_token = request.data.get("captcha")
        if not verify_captcha(captcha_token):
            return Response({"error": "Invalid CAPTCHA"}, status=status.HTTP_400_BAD_REQUEST)

        email = request.data.get('email')
        username = request.data.get('username')
        
        if email and User.objects.filter(email=email).exists():
            return Response(
                {"detail": "A user with this email already exists."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if username and User.objects.filter(username=username).exists():
            return Response(
                {"detail": "A user with this username already exists."},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            user = serializer.save()
            user.email_verified = False
            user.save()
            
            # Get frontend verification URL from request or settings
            frontend_verify_url = request.data.get(
                'frontend_verify_url',
                settings.DEFAULT_FRONTEND_VERIFY_URL
            )
            
            send_verification_email(user, frontend_verify_url)
            
        except IntegrityError as e:
            if 'unique constraint' in str(e).lower():
                if 'email' in str(e):
                    return Response(
                        {"detail": "A user with this email already exists."},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                elif 'username' in str(e):
                    return Response(
                        {"detail": "A user with this username already exists."},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            raise
        
        user_folder = os.path.join(settings.MEDIA_ROOT, f'user_{user.id}')
        if not os.path.exists(user_folder):
            os.makedirs(user_folder)
                    
        return Response({
            "user": serializer.data,
            "message": "User created successfully. Please check your email for verification."
        }, status=status.HTTP_201_CREATED)

class LogoutViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def create(self, request):
        response.delete_cookie('access_token')
        response.delete_cookie('refresh_token')
        response = Response({'message': 'Logged out successfully'})
        return response