# routing.py
from django.urls import re_path
from notifications import consumer

websocket_urlpatterns = [
    re_path(r'^riffaa/ws/notifications/$', consumer.NotificationConsumer.as_asgi()),
]