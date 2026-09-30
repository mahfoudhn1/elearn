import requests
from django.conf import settings
from rest_framework_simplejwt.tokens import RefreshToken


def get_tokens_for_user(user):
    refresh = RefreshToken.for_user(user)
    return {
        'refresh': str(refresh),
        'access': str(refresh.access_token),
    }

def verify_captcha(token):
    """Verify a Cloudflare Turnstile token.

    CAPTCHA is enforced only in production. Local/dev environments skip it so
    testing is not blocked.
    """
    if not getattr(settings, "IS_PRODUCTION", False):
        return True

    url = "https://challenges.cloudflare.com/turnstile/v0/siteverify"
    data = {
        "secret": settings.CLOUDFLARE_TURNSTILE_SECRET_KEY,
        "response": token,
    }
    try:
        response = requests.post(url, data=data).json()
    except requests.RequestException:
        return False
    return response.get("success", False)
