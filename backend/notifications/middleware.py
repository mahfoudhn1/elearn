import jwt
from django.conf import settings
from urllib.parse import parse_qs
from channels.middleware import BaseMiddleware
from django.contrib.auth import get_user_model
from channels.db import database_sync_to_async

User = get_user_model()

class JWTAuthMiddleware(BaseMiddleware):
    async def __call__(self, scope, receive, send):
        cookies = self.get_cookies(scope)

        token = cookies.get("access_token", None) 

        if token:
            scope["user"] = await self.get_user_from_token(token)
        else:
            scope["user"] = None  # Anonymous user

        return await super().__call__(scope, receive, send)

    @staticmethod
    def get_cookies(scope):
        headers = dict(scope["headers"])
        cookie_header = headers.get(b"cookie", b"").decode()
        cookies = {}
        for item in cookie_header.split("; "):
            if "=" in item:
                key, value = item.split("=", 1)
                cookies[key] = value
        return cookies

    @database_sync_to_async
    def get_user_from_token(self, token):
        """Decode JWT and get user instance."""
        try:
            decoded_data = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
            user_id = decoded_data.get("user_id")
            return User.objects.get(id=user_id)
        except (jwt.ExpiredSignatureError, jwt.DecodeError, User.DoesNotExist):
            return None  
