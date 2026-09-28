from rest_framework import serializers
from .models import TeacherApplication

from core.serializers import UUIDModelSerializer, UUIDRelatedField
class TeacherApplicationSerializer(UUIDModelSerializer):
    class Meta:
        model = TeacherApplication
        fields = "__all__"
