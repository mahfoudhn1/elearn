from rest_framework import serializers
from .models import Notification

from core.serializers import UUIDModelSerializer, UUIDRelatedField
class NotificationSerializer(UUIDModelSerializer):
    class Meta:
        model = Notification
        fields = ['id', 'notification_type', 'message', 'room_id', 'group_id', 'created_at', 'read']
