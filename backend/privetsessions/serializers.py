from rest_framework import serializers

from users.serializers import StudentSerializer, TeacherSerializer
from users.models import Student, Teacher
from .models import PrivateSessionRequest, PrivateSession

class PrivateSessionRequestSerializer(serializers.ModelSerializer):
    teacher_id = serializers.PrimaryKeyRelatedField(
        queryset=Teacher.objects.all(),
        source='teacher',  # Map to the `teacher` field in the model
        write_only=True    # Only used for input, not output
    )
    student_id = serializers.PrimaryKeyRelatedField(
        queryset=Student.objects.all(),
        source='student',  # Map to the `teacher` field in the model
        write_only=True    # Only used for input, not output
    )
    teacher = TeacherSerializer(read_only=True)
    student = StudentSerializer(read_only=True)
    class Meta:
        model = PrivateSessionRequest
        fields = [
            'id', 'student', 'teacher','teacher_id', 'student_id', 'requested_at', 'status', 
            'student_notes', 'teacher_notes', 'proposed_date'
        ]
        read_only_fields = ['id', 'requested_at'] 


class PrivateSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = PrivateSession
        fields = ['id', 'session_request', 'session_date', 'paid']
        read_only_fields = ['id']  # ID is auto-generated

    def validate_session_date(self, value):
        """
        Validate that the session date is in the future.
        """
        from django.utils import timezone
        if value <= timezone.now():
            raise serializers.ValidationError("Session date must be in the future.")
        return value