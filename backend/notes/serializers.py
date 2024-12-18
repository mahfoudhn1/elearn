from rest_framework import serializers
from .models import Note


class NoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Note
        fields = ["id", "user", "title", "subject", "content", "created_at"]

    def validate_content(self, value):
        if isinstance(value, list):  # If content is in an array format, handle it properly
            return ''.join(value)  # Example: join the content list into a string
        return value
