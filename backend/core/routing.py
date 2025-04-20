# routing.py
from django.urls import re_path
from chat import chatconsumer
from notifications import consumer

websocket_urlpatterns = [
    re_path(r'^ws/notifications/$', consumer.NotificationConsumer.as_asgi()),
    re_path(r'ws/chat/(?P<group_id>\d+)/$', chatconsumer.ChatConsumer.as_asgi()),

]