import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from channels.security.websocket import AllowedHostsOriginValidator
from notifications.middleware import JWTAuthMiddleware
from . import routing

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')

# Get environment
IS_PRODUCTION = os.getenv('DJANGO_ENV') == 'production'

application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": AllowedHostsOriginValidator(
        AuthMiddlewareStack(
            JWTAuthMiddleware(
                URLRouter(routing.websocket_urlpatterns)
            )
        )
    ) if IS_PRODUCTION else AuthMiddlewareStack(
        JWTAuthMiddleware(
            URLRouter(routing.websocket_urlpatterns)
        ))
})