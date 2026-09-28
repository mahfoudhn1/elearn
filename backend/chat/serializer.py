from rest_framework import serializers

from users.models import User
from users.serializers import UserSerializer
from .models import ChatMessage

from core.serializers import UUIDModelSerializer, UUIDRelatedField
class ChatMessageSerializer(UUIDModelSerializer):
    sender_name = serializers.SerializerMethodField()
    file_url = serializers.SerializerMethodField()
    sender = UserSerializer(read_only=True)
    class Meta:
        model = ChatMessage
        fields = ['id', 'group', 'sender', 'sender_name', 'message', 'file', 'file_url', 'is_pinned', 'created']
        read_only_fields = ['id', 'created', 'sender', 'sender_name', 'file_url']

    def get_sender_name(self, obj):
        return f"{obj.sender.first_name} {obj.sender.last_name}"
    def get_file_url(self, obj):
        if obj.file:
            return obj.file.url
        return None
