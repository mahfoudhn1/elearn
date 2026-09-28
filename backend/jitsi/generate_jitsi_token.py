import jwt
import time
from django.conf import settings

def generate_jitsi_token(user, room_name, expires_in):  # Increased to 24 hours
    secret = settings.JITSI_APP_SECRET
    app_id = settings.JITSI_APP_ID
    jitsi_domain = settings.JITSI_APP_DOMAIN

    is_moderator = hasattr(user, 'teacher')  # Teacher is moderator


    payload = {
        "aud": "riffaedu",
        "iss": app_id,
        "sub": jitsi_domain,
        "room": room_name,
        "exp": int(time.time()) + expires_in,
        "nbf": int(time.time()) - 3600,  
        "context": {
            "user": {
                "id": str(user.uuid),
                "name": user.get_full_name() or user.username,
                "email": user.email or "",
                "moderator": is_moderator,
                "avatar": user.profile.get_avatar_url() if hasattr(user, 'profile') else "",
            },
            "features": {
                "livestreaming": is_moderator,
                "recording": is_moderator,  
                "screen-sharing": is_moderator,
                "outbound-call": False,
                "transcription": False,
                "sip-inbound-call": False,
                "toolbox": [
                    'microphone', 'camera', 'closedcaptions', 'desktop', 'fullscreen',
                    'fodeviceselection', 'hangup', 'profile', 'chat', 'recording',
                    'livestreaming', 'etherpad', 'sharedvideo', 'settings', 'raisehand',
                    'videoquality', 'filmstrip', 'feedback', 'stats', 'shortcuts',
                    'tileview', 'videobackgroundblur', 'download', 'help', 'mute-everyone',
                    'security'
                ]
            }
        }
    }

    # Add additional claims for better session stability
    payload.update({
        "allow_empty_token": False,
        "always_display_toolbox": True,
        "enableWelcomePage": False,
    })

    token = jwt.encode(payload, secret, algorithm='HS256')
    return token
