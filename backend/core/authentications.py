# your_project/auth/backends.py

from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.tokens import RefreshToken

class JWTAuthenticationWithCookies(JWTAuthentication):
    def authenticate(self, request):
        cookie = request.COOKIES.get('access_token')
        if cookie:
            try:
                validated_token = self.get_validated_token(cookie)
                user = self.get_user(validated_token)
                return (user, validated_token)
            except Exception:
                return None
        return None
