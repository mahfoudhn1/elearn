
# from datetime import datetime, timedelta
import jwt
# from django.conf import settings
# from pathlib import Path
import time

def load_private_key(key_path=None, key_string=None):
    """
    Load private key from file or string
    """
    if key_string:
        return key_string
    if key_path:
        with open(key_path, 'r') as key_file:
            return key_file.read()
    raise ValueError("Either key_path or key_string must be provided")

def generate_jitsi_token(user, room_name):
    # Jitsi secret key (configured in your Jitsi setup)
    secret = "mahfoud1996"
    
    # Jitsi app ID (configured in your Jitsi setup)
    app_id = "mahfoud_hn"
    
    # Token payload
    payload = {
        "context": {
            "user": {
                "id": user.id,
                "name": user.username,
                "email": user.email,
            },
            "group": room_name,
        },
        "aud": app_id,
        "iss": app_id,
        "sub": "localhost",  # Replace with your Jitsi domain
        "room": room_name,
        "exp": int(time.time()) + 3600,  # Token expiration time (1 hour)
        "moderator": hasattr(user, 'teacher'),  # Grant moderator rights to teachers
    }
    
    # Generate JWT token
    token = jwt.encode(payload, secret, algorithm='HS256')
    return token




