import requests
from rest_framework_simplejwt.tokens import RefreshToken

from core import settings

def get_tokens_for_user(user):
    refresh = RefreshToken.for_user(user)
    return {
        'refresh': str(refresh),
        'access': str(refresh.access_token),
    }

def verify_captcha(token):
    """Verify Cloudflare Turnstile token"""
    url = "https://challenges.cloudflare.com/turnstile/v0/siteverify"
    data = {
        "secret": settings.CLOUDFLARE_TURNSTILE_SECRET_KEY,
        "response": token,
    }
    response = requests.post(url, data=data).json()
    return response.get("success", False)
