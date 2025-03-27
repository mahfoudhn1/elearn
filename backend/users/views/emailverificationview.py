from tokenize import TokenError
from rest_framework_simplejwt.tokens import RefreshToken
from django.core.mail import send_mail
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import viewsets, status
from users.models import User
from users.serializers import UserSerializer
from core import settings

def send_verification_email(user, frontend_verify_url):
    token = RefreshToken.for_user(user).access_token
    verification_url = f"{frontend_verify_url}?token={str(token)}"
    
    subject = 'Verify your email address'
    message = f"""
    Welcome {user.username}!
    
    Please click the following link to verify your email address:
    {verification_url}
    
    If you didn't request this, please ignore this email.
    """
    
    send_mail(
        subject,
        message,
        settings.DEFAULT_FROM_EMAIL,
        [user.email],
        fail_silently=False,
    )


class VerifyEmailView(viewsets.ViewSet):
    permission_classes = [AllowAny]
    
    def create(self, request):
        token = request.data.get('token')
        if not token:
            return Response({'error': 'Token not provided'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            access_token = RefreshToken(token)
            user_id = access_token.payload.get('user_id')
            
            if not user_id:
                return Response({'error': 'Invalid token'}, status=status.HTTP_400_BAD_REQUEST)
            
            user = User.objects.get(id=user_id)
            if user.email_verified:
                return Response({'message': 'Email already verified'}, status=status.HTTP_200_OK)
                
            user.email_verified = True
            user.save()
            
            return Response({
                'message': 'Email successfully verified',
                'user': UserSerializer(user).data
            }, status=status.HTTP_200_OK)
            
        except TokenError as e:
            return Response({'error': 'Invalid or expired token'}, status=status.HTTP_400_BAD_REQUEST)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

class ResendVerificationEmailView(viewsets.ViewSet):
    permission_classes = [AllowAny]
    
    def create(self, request):
        email = request.data.get('email')
        if not email:
            return Response({'error': 'Email is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            user = User.objects.get(email=email)
            if user.email_verified:
                return Response({'message': 'Email is already verified'}, status=status.HTTP_200_OK)
            
            frontend_verify_url = request.data.get(
                'frontend_verify_url',
                settings.DEFAULT_FRONTEND_VERIFY_URL
            )
            
            send_verification_email(user, frontend_verify_url)
            return Response({'message': 'Verification email resent successfully'}, status=status.HTTP_200_OK)
            
        except User.DoesNotExist:
            return Response({'error': 'User with this email does not exist'}, status=status.HTTP_404_NOT_FOUND)