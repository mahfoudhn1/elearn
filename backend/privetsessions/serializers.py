from rest_framework import serializers
from .models import *


class PrivetSessionSerializer(serializers.ModelSerializer):

    class Meta:
        model = PrivetSession
        fields = ['id', 'student', 'teacher', 'paid', 'session_date', 'notes']

class PrivateSessionRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = PrivateSessionRequest
        fields = ['id', 'teacher', 'requested_at', 'session_date', 'status']
