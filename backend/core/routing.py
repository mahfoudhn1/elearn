# routing.py
from django.urls import re_path
from chat import chatconsumer
from notifications import consumer


websocket_urlpatterns = [
    re_path(r'^riffaa/ws/notifications/$', consumer.NotificationConsumer.as_asgi()),
    re_path(r'riffaa/ws/chat/(?P<group_id>[0-9a-fA-F-]{36})/$', chatconsumer.ChatConsumer.as_asgi()),


]
