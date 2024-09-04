import base64
import requests
from datetime import datetime, timezone, timedelta
from django.conf import settings

class ZoomOAuthService:
    base_url = 'https://api.zoom.us/v2/'

    def __init__(self):
        self.client_id = settings.ZOOM_CLIENT_ID
        self.client_secret = settings.ZOOM_CLIENT_SECRET
        self.redirect_uri = settings.ZOOM_REDIRECT_URI
    
    def get_authorization_url(self):
  
        return (
            f'https://zoom.us/oauth/authorize?response_type=code&client_id={self.client_id}&redirect_uri={self.redirect_uri}'
        )

    def exchange_code_for_token(self, code):
        url = 'https://zoom.us/oauth/token'
        headers = {
            'Authorization': f'Basic {self._encode_credentials()}',
            'Content-Type': 'application/x-www-form-urlencoded'
        }
        data = {
            'grant_type': 'authorization_code',
            'code': code,
            'redirect_uri': self.redirect_uri
        }
        response = requests.post(url, headers=headers, data=data)
        response.raise_for_status()
        return response.json()

    def _encode_credentials(self):
        import base64
        credentials = f'{self.client_id}:{self.client_secret}'
        return base64.b64encode(credentials.encode()).decode()

    def get_user_meetings(self, access_token):
        url = f'{self.base_url}users/me/meetings'
        headers = {
            'Authorization': f'Bearer {access_token}'
        }
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        return response.json()
        
    def get_access_token(self, user):
   
        access_token = user.zoom_access_token
        expires_at = user.zoom_token_expires_at
        refresh_token = user.zoom_refresh_token

        if datetime.now(timezone.utc) >= expires_at:
            tokens = self.refresh_access_token(refresh_token)
            access_token = tokens['access_token']
            refresh_token = tokens['refresh_token']
            expires_in = tokens['expires_in']

           
            user.zoom_access_token = access_token
            user.zoom_refresh_token = refresh_token
            user.zoom_token_expires_at = datetime.now() + timedelta(seconds=expires_in)
            user.save()

        return access_token

    def refresh_access_token(self, refresh_token):

        response = requests.post(
            'https://zoom.us/oauth/token',
            params={
                'grant_type': 'refresh_token',
                'refresh_token': refresh_token,
            },
            headers={
                'Authorization': 'Basic ' + base64.b64encode(f'{self.client_id}:{self.client_secret}'.encode()).decode(),
                'Content-Type': 'application/x-www-form-urlencoded',
            },
        )
        return response.json()

    def create_meeting(self, access_token, topic, start_time, duration, agenda):
        url = "https://api.zoom.us/v2/users/me/meetings"
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }
        payload = {
            "topic": topic,
            "type": 2,
            "agenda": agenda,
            "start_time": start_time.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "duration": duration,
            "timezone": "Africa/Algiers"
        }

        response = requests.post(url, headers=headers, json=payload)
        if response.status_code != 201:
            response.raise_for_status()
        return response.json()