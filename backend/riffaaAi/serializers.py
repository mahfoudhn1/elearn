from rest_framework import serializers
from .models import UserToken, AIInteraction

from core.serializers import UUIDModelSerializer, UUIDRelatedField
class UserTokenSerializer(UUIDModelSerializer):
    class Meta:
        model = UserToken
        fields = ('tokens',)

class AIInteractionSerializer(UUIDModelSerializer):
    class Meta:
        model = AIInteraction
        fields = ('id', 'prompt', 'response', 'pdf_file', 'created_at')
        extra_kwargs = {
            'pdf_file': {'write_only': True}
        }
