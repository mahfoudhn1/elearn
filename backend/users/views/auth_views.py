from datetime import timedelta
from django.utils import timezone
from django.http import HttpResponse, HttpResponseRedirect
import logging
import json
from tokenize import TokenError
from rest_framework import viewsets, status
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from users.serializers import LoginSerializer, RegisterSerializer, UserSerializer
from users.models import User


logger = logging.getLogger(__name__)


def get_tokens_for_user(user):
    refresh = RefreshToken.for_user(user)
    return {
        'refresh': str(refresh),
        'access': str(refresh.access_token),
    }

class MyTokenObtainPairView(TokenObtainPairView):
    # Optionally customize the behavior
    pass

class MyTokenRefreshView(TokenRefreshView):

    permission_classes = [AllowAny]  

    def post(self, request):
        old_refresh_token = request.COOKIES.get('refresh_token') or request.data.get("refreshToken")
        
        if not old_refresh_token:
            return Response({'error': 'Refresh token not provided'}, status=400)
        
        try:
            # Decode the old refresh token
            old_token = RefreshToken(old_refresh_token)
            
            # Extract user id from the token payload
            user_id = old_token.payload.get('user_id')
            if not user_id:
                return Response({'error': 'Token contained no recognizable user identification'}, status=400)
            
            # Get the user from the database
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
    
   

class LogoutViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def create(self, request):
        # Perform logout logic here
        response.delete_cookie('access_token')
        response.delete_cookie('refresh_token')
        response = Response({'message': 'Logged out successfully'})
        return response
