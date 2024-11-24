from rest_framework import serializers
from .models import Note


class NoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Note
        fields = ["id", "student", "title", "subject"]
        
        def create(self, validated_data):
            request = self.context['request']
            validated_data['student'] = request.user
            return super().create(validated_data)