from datetime import timedelta
from django.utils import timezone
from django.http import HttpResponseRedirect
from django.core.mail import send_mail
from django.conf import settings
from django.urls import reverse
import logging
import os
from rest_framework import viewsets, status
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from core.gmail import send_verification_email
from users.utils import verify_captcha
from users.serializers import LoginSerializer, RegisterSerializer, UserSerializer
from users.models import User
from django.db import IntegrityError
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.contrib.auth.tokens import default_token_generator

from core.views import UUIDLookupMixin
logger = logging.getLogger(__name__)


def is_mobile_request(request):
    if str(request.headers.get('X-Mobile-Client', '')).lower() == 'true':
        return True

    user_agent = str(request.headers.get('User-Agent', '')).lower()
    mobile_keywords = ['android', 'iphone', 'ipad', 'reactnative', 'okhttp', 'expo']
    return any(keyword in user_agent for keyword in mobile_keywords)


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
        old_refresh_token = (
            request.COOKIES.get('refresh_token')
            or request.data.get('refresh_token')
            or request.data.get('refreshToken')
            or request.data.get('refresh')
        )
        
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
            
            # Prepare response
            response = Response({
                'access_token': new_access_token,
                'refresh_token': new_refresh_token
            })
            
            response.set_cookie(
                'access_token',
                new_access_token,
                httponly=False,
                secure=False,
                path='/',
                samesite='Lax',
            )
            
            response.set_cookie(
                'refresh_token',
                new_refresh_token,
                httponly=False,
                secure=False,
                samesite='Lax',
                max_age=60 * 60 * 24 * 7,  # 7 days
                path='/',
            )
        
            return response

        except TokenError as e:
            print(f"Token error: {str(e)}")
            return Response({'error': str(e)}, status=400)
        except Exception as e:
            print(f"Error refreshing token: {str(e)}")
            return Response({'error': 'Invalid refresh token'}, status=400)
        
class AuthViewSet(viewsets.GenericViewSet):
    serializer_class = LoginSerializer
    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):
        # captcha_token = request.data.get("captcha")
        # if not verify_captcha(captcha_token):
        #     return Response({"error": "Invalid CAPTCHA"}, status=status.HTTP_400_BAD_REQUEST)
        logger.warning("=== AUTH REQUEST ===")
        logger.warning("Method: %s", request.method)
        logger.warning("Path: %s", request.path)
        logger.warning("Headers: %s", dict(request.headers))
        logger.warning("Data keys: %s", list(request.data.keys()))
        logger.warning("Username: %s", request.data.get("username"))
        logger.warning("Mobile: %s", is_mobile_request(request))

        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            logger.warning("LOGIN VALIDATION ERROR: %s", serializer.errors)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        user = serializer.validated_data['user']

        # if not user.email_verified:
        #     return Response(
        #         {"error": "Email not verified. Please check your email for verification link."},
        #         status=status.HTTP_403_FORBIDDEN
        #     )

        tokens = get_tokens_for_user(user)
        response_data = {
            'user': UserSerializer(user).data,
            'message': 'Authentication successful'
        }

        response_data.update({
            'access_token': tokens['access'],
            'refresh_token': tokens['refresh'],
        })
        response = Response(response_data, status=status.HTTP_200_OK)
        
        response.set_cookie(
            'access_token',
            tokens['access'],
            httponly=False,
            secure=False,
            path='/',
            samesite='Lax',
        )
        response.set_cookie(
            'refresh_token',
            tokens['refresh'],
            httponly=False,
            secure=False,
            samesite='Lax',
            max_age=60 * 60 * 24 * 7,  # 7 days
            path='/',
        )
        
        return response
 


class RegisterView(UUIDLookupMixin, viewsets.ModelViewSet):
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]
    queryset = User.objects.all()  # Required for ModelViewSet

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
            user.save()  # verification_token is already set by default=uuid.uuid4()
            user_folder = os.path.join(settings.MEDIA_ROOT, f'user_{user.id}')
            if not os.path.exists(user_folder):
                os.makedirs(user_folder)
            send_verification_email(user.email, user.verification_token)
                
            return Response({
                "user": serializer.data,
                "message": "User created successfully. Please check your email for verification."
            }, status=status.HTTP_201_CREATED)

            
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

class LogoutViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def create(self, request):
        response = Response({'message': 'Logged out successfully'})
        response.delete_cookie('access_token')
        response.delete_cookie('refresh_token')
        return response
