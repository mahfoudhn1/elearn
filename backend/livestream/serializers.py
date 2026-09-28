from rest_framework import serializers
from .models import ZoomMeeting
from users.models import Teacher

from core.serializers import UUIDModelSerializer, UUIDRelatedField
class ZoomMeetingSerializer(UUIDModelSerializer):
    teacher = UUIDRelatedField(queryset=Teacher.objects.all())

    class Meta:
        model = ZoomMeeting
        fields =  ['id', 'teacher', 'topic', 'start_time', 'duration', 'zoom_meeting_id', 'join_url', "agenda"]
        read_only_fields = ['id', 'teacher', 'zoom_meeting_id', 'join_url']
