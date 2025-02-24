from time import time
import json

from django.conf import settings
from django.http import HttpResponse
from django.contrib.auth import get_user_model
import requests as req
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token
from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
import logging

from users.serializers import UserSerializer



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

        if not code:
            return Response({'error': 'Authorization code missing'}, status=status.HTTP_400_BAD_REQUEST)

        token_url = 'https://oauth2.googleapis.com/token'
        data = {
            'code': code,
            'client_id': settings.GOOGLE_CLIENT_ID,
            'client_secret': settings.GOOGLE_CLIENT_SECRET,
            'redirect_uri': settings.GOOGLE_OAUTH_REDIRECT_URI, 
            'grant_type': 'authorization_code',
        }

        try:
            headers = {
                'Content-Type': 'application/x-www-form-urlencoded',
            }
            response = req.post(token_url, data=data, headers=headers)
            response.raise_for_status()
            response_data = response.json()
            
            logger.debug(f"Token exchange response: {response_data}")

        except req.exceptions.RequestException as e:
            logger.error(f"Token exchange failed: {e}")
            if hasattr(e.response, 'json'):
                error_details = e.response.json()
                logger.error(f"Google API error response: {error_details}")
            return Response(
                {'error': 'Failed to exchange authorization code for tokens', 'details': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        id_token_value = response_data.get('id_token')
        if not id_token_value:
            logger.error(f"ID token not found in response. Response data: {response_data}")
            return Response({'error': 'ID token not found in response'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            id_info = id_token.verify_oauth2_token(
                id_token_value,
                google_requests.Request(),
                settings.GOOGLE_CLIENT_ID
            )
            
            if id_info['exp'] < time():
                return Response({'error': 'Token has expired'}, status=status.HTTP_400_BAD_REQUEST)

            user_email = id_info.get('email')
            if not user_email:
                return Response({'error': 'Email not found in token'}, status=status.HTTP_400_BAD_REQUEST)

            user_name = id_info.get('name', '')
            profile_picture = id_info.get('picture', '')
            
            names = user_name.split(' ', 1)
            first_name = names[0]
            last_name = names[1] if len(names) > 1 else ''
            username = user_email.split('@')[0]
            
            User = get_user_model()
            user, created = User.objects.get_or_create(
                email=user_email,
                defaults={
                    'username': username,
                    'first_name': first_name,
                    'last_name': last_name,
                    'avatar': profile_picture
                }
            )
            
            if not created:
                user.first_name = first_name
                user.last_name = last_name
                user.avatar = profile_picture
                user.save()

            tokens = get_tokens_for_user(user)
            response = HttpResponse()

            # cookie_params = {
            #     'httponly': False,
            #     'secure': False,  # Move to settings
            #     'samesite': 'Lax',
            #     'max_age': 3600 * 24 * 7,  # 7 days
            #     'path': '/'
            # }
            response.set_cookie(
                'access_token',
                tokens['access'],
                httponly=True,
                secure= False, 
            )

            response.set_cookie(
                'refresh_token',
                tokens['refresh'],
                httponly=True,
                secure= False,  # Use secure cookies if HTTPS is enabled
            )

            
            response_data = {
                'user': UserSerializer(user).data,
                'message': 'Authentication successful'
            }
            
            response.content = json.dumps(response_data)
 
            response['Content-Type'] = 'application/json'
            
            return response

        except ValueError as e:
            logger.error(f"Token verification failed: {e}")
            return Response({
                'error': 'Token verification failed',
                'details': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)