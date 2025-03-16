from rest_framework import serializers
from users.serializers import StudentSerializer, TeacherSerializer
from users.models import Teacher, Student
from .models import Subscription, SubscriptionPlan
from datetime import datetime, timedelta



class SubscriptionPlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = SubscriptionPlan
        fields = ['id', 'name', 'price', 'duration_days', 'description']

class SubscriptionSerialize(serializers.ModelSerializer):
    # For writing: Accept a teacher ID
    teacher_id = serializers.PrimaryKeyRelatedField(
        queryset=Teacher.objects.all(),
        source='teacher',  # Map to the `teacher` field in the model
        write_only=True    # Only used for input, not output
    )
    
    # For reading: Nest the full teacher object
    teacher = TeacherSerializer(read_only=True)
    
    # Student remains read-only
    student = StudentSerializer(read_only=True)
    
    # Plan is writable via ID
    plan = serializers.PrimaryKeyRelatedField(queryset=SubscriptionPlan.objects.all())

    class Meta:
        model = Subscription
        fields = [
            'id', 'teacher', 'teacher_id', 'student', 'plan',
            'start_date', 'end_date', 'is_active', 'subs_history'
        ]
        read_only_fields = ['student', 'start_date', 'end_date', 'is_active', 'subs_history']

    def create(self, validated_data):
        request = self.context.get('request')
        user = request.user

        # Ensure the authenticated user is a student
        try:
            student = Student.objects.get(user=user)
        except Student.DoesNotExist:
            raise serializers.ValidationError("The authenticated user is not a student")

        # Extract teacher and plan from validated_data
        teacher = validated_data.pop('teacher')
        plan = validated_data.pop('plan')

        # Create the Subscription instance
        subscription = Subscription.objects.create(
            student=student,
            teacher=teacher,
            plan=plan,
            **validated_data
        )

        # Add subscription creation to history
        subscription.add_subs_to_history("Created")
        return subscription
class SubscriptionPlanSerializer(serializers.ModelSerializer):
        class Meta:
            model = SubscriptionPlan
            field='__all__'