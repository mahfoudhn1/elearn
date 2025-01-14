import jwt
import datetime

import jwt
import datetime
from django.conf import settings
from users.models import User

def generate_jitsi_token(User, room_name: str) -> str:
    secret = settings.JITSI_APP_SECRET  
    app_id = settings.JITSI_APP_ID

    moderator = User.role == 'teacher'

    payload = {
        "context": {
            "user": {
                "name": User.username,
                "email": User.email,
                "id": str(User.id),
                "moderator": moderator,
            }
        },
        "aud": "jitsi",
        "iss": app_id,
        "sub": "localhost",
        "room": room_name,
        "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=1),  # Token expiration
    }

    token = jwt.encode(payload, secret, algorithm="HS256")
    return token

def refresh_jitsi_token(User, room_name: str) -> str:
    if User.token_expiry < datetime.datetime.utcnow():
        return generate_jitsi_token(User, room_name)
    return User.jitsi_token
