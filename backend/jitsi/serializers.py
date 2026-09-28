from rest_framework import serializers
from .models import Meeting

from core.serializers import UUIDModelSerializer, UUIDRelatedField
class MeetingSerializer(UUIDModelSerializer):
    class Meta:
        model = Meeting
        fields = ['id', 'teacher','privetsession','is_active', 'room_name', 'start_time', 'end_time']
