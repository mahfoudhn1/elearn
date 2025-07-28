import jwt
import time
from django.conf import settings

def generate_jitsi_token(user, room_name):
    secret = settings.JITSI_APP_SECRET
    app_id = settings.JITSI_APP_ID
    jitsi_domain = settings.JITSI_APP_DOMAIN

    is_moderator = hasattr(user, 'teacher')

    payload = {
        "aud": "jitsi",
        "iss": app_id,
        "sub": jitsi_domain,
        "room": room_name,
        "exp": int(time.time()) + 10800,
        "moderator": is_moderator,
        "context": {
            "user": {
                "id": str(user.id),
                "name": user.get_full_name() or user.username,
                "email": user.email or "",
            },
            "features": {
                "enable_audio": is_moderator,  # true only for moderators
                "enable_video": is_moderator,
                "chat_enabled": True,
            }
        }
    }

    token = jwt.encode(payload, secret, algorithm='HS256')
    return token
