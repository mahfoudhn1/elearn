import os
from rest_framework import serializers

from users.models import User
from users.serializers import UserSerializer
from .models import ChatMessage

class ChatMessageSerializer(serializers.ModelSerializer):
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
    def validate_file(self, value):
        max_size = 10 * 1024 * 1024  # 10 MB
        if value.size > max_size:
            raise serializers.ValidationError("File size exceeds 10MB.")

        allowed_extensions = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.gif',
                              '.ppt', '.pptx', '.xls', '.xlsx']
        ext = os.path.splitext(value.name)[1].lower()
        if ext not in allowed_extensions:
            raise serializers.ValidationError(
                "Unsupported file type. Only PDF, Word, PowerPoint, Excel, and image files are allowed."
            )
        return value
