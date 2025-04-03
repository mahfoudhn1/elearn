from tokenize import TokenError
from django.core.mail import send_mail
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import viewsets, status
from users.models import User
from users.serializers import UserSerializer
from core import settings
from rest_framework_simplejwt.tokens import AccessToken




class VerifyEmailView(viewsets.ViewSet):
    permission_classes = [AllowAny]
    
    def create(self, request):
        token = request.data.get('token')
        if not token:
            return Response({'error': 'Token not provided'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            access_token = AccessToken(token)  # Use AccessToken instead of RefreshToken
            user_id = access_token['user_id']

            user_id = access_token.payload.get('user_id')
            print(user_id)
            
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

# class ResendVerificationEmailView(viewsets.ViewSet):
#     permission_classes = [AllowAny]
    
#     def create(self, request):
#         email = request.data.get('email')
#         if not email:
#             return Response({'error': 'Email is required'}, status=status.HTTP_400_BAD_REQUEST)
        
#         try:
#             user = User.objects.get(email=email)
#             if user.email_verified:
#                 return Response({'message': 'Email is already verified'}, status=status.HTTP_200_OK)
            
#             frontend_verify_url = request.data.get(
#                 'frontend_verify_url',
#                 settings.DEFAULT_FRONTEND_VERIFY_URL
#             )
            
#             send_verification_email(user, frontend_verify_url)
#             return Response({'message': 'Verification email resent successfully'}, status=status.HTTP_200_OK)
            
#         except User.DoesNotExist:
#             return Response({'error': 'User with this email does not exist'}, status=status.HTTP_404_NOT_FOUND)