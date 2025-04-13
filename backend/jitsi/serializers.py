from rest_framework import serializers
from .models import Meeting

class MeetingSerializer(serializers.ModelSerializer):
    class Meta:
        model = Meeting
        fields = ['id', 'teacher','privetsession', 'is_active','room_name', 'start_time', 'end_time']
