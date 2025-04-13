import jwt
import time
from django.conf import settings

def generate_jitsi_token(user, room_name):
    # Your Jitsi configuration
    secret = settings.JITSI_APP_SECRET  # Use a strong secret in production!
    app_id = settings.JITSI_APP_ID
    jitsi_domain = settings.JITSI_APP_DOMAIN

    payload = {
        "aud": "jitsi",
        "iss": app_id,
        "sub": jitsi_domain,
        "room": room_name,  # Can be specific room or '*'
        "exp": int(time.time()) + 10800,  # Expires in 3 hour
        "moderator": hasattr(user, 'teacher'),  # Only teacher gets moderator true
        "context": {
            "user": {
                "id": str(user.id),
                "name": user.get_full_name() or user.username,
                "email": user.email or "",
            }
        },
    }

    token = jwt.encode(payload, secret, algorithm='HS256')
    return token
