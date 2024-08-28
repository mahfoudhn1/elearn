from rest_framework import serializers
from users.models import Teacher, Student
from .models import Subscription, SubscriptionPlan
from datetime import datetime, timedelta



class SubscriptionPlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = SubscriptionPlan
        fields = ['id', 'name', 'price', 'duration_days', 'description']

class SubscriptionSerialize(serializers.ModelSerializer):
    teacher = serializers.PrimaryKeyRelatedField(queryset=Teacher.objects.all())
    student = serializers.PrimaryKeyRelatedField(read_only=True) 
    plan = serializers.PrimaryKeyRelatedField(queryset=SubscriptionPlan.objects.all())

    class Meta:
        model = Subscription
        fields = ['id', 'teacher', 'student','plan', 'start_date', 'end_date', 'is_active', 'subs_history']
        read_only_fields = ['student', 'start_date', 'end_date', 'is_active', 'subs_history']

    def create(self, validated_data):
        request = self.context.get('request')
        user = request.user
        
        try:
            student = Student.objects.get(user=user)
        except Student.DoesNotExist:
            raise serializers.ValidationError("The authenticated user is not a student")
        
        teacher = validated_data.pop('teacher')
        plan = validated_data.pop('plan')
        
        subscription = Subscription.objects.create(
            student=student,
            teacher=teacher,
            plan=plan,
            **validated_data
        )
        subscription.add_subs_to_history("Created")
        return subscription

