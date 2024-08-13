from rest_framework import serializers
from users.models import Teacher, Student
from .models import Subscription
from datetime import datetime, timedelta

class SubscriptionSerialize(serializers.ModelSerializer):
    teacher = serializers.PrimaryKeyRelatedField(queryset=Teacher.objects.all())
    student = serializers.PrimaryKeyRelatedField(read_only=True) 

    class Meta:
        model = Subscription
        fields = ['id', 'teacher', 'student',  'start_date', 'end_date', 'is_active', 'subs_history']
        read_only_fields = ['student', 'start_date', 'end_date', 'is_active', 'subs_history']

    def create(self, validated_data):
        request = self.context.get('request')
        user = request.user

        try:
            student = Student.objects.get(user=user)
        except Student.DoesNotExist:
            raise serializers.ValidationError("The authenticated user is not a student")

        teacher = validated_data.pop('teacher')

        subscription = Subscription.objects.create(student=student,
                                                    teacher=teacher,
                                                    **validated_data)
        subscription.add_subs_to_history("Created")
        return subscription

