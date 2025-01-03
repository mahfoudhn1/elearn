from rest_framework import serializers

from users.serializers import StudentSerializer, TeacherSerializer
from .models import Group, Schedule, StudentGroupRequest
from users.models import Teacher, Student, SchoolLevel
from users.serializers import gradeSerializer, fieldofstudySerializer 

class StudentGroupRequestSerializer(serializers.ModelSerializer):
    student = serializers.PrimaryKeyRelatedField(queryset=Student.objects.all())

    class Meta:
        model = StudentGroupRequest
        fields = ['id', 'student', 'group', 'created_at', 'is_accepted', 'is_rejected']
        read_only_fields = ['created_at', 'is_accepted', 'is_rejected']
    
    def to_representation(self, instance):
        representation = super().to_representation(instance)

        if instance.student:  # Check if there are any students
            representation['student'] = StudentSerializer(instance.student).data
        else:
            representation['student'] = None  
        return representation


class ScheduleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Schedule
        fields = ['id', 'user', 'day_of_week', 'scheduled_date', 'start_time', 'end_time', 'group','color','zoom_meeting_id','zoom_join_url']



class GroupSerializer(serializers.ModelSerializer):
    school_level = serializers.CharField()  # Accepts a name for school_level

    class Meta:
        model = Group
        fields = ['id', 'name', 'students', 'school_level', 'grade', 'field_of_study', 'created_at', 'updated_at', 'status']

    def create(self, validated_data):
        request = self.context['request']

        # Ensure the user is a teacher
        try:
            teacher = request.user.teacher
        except Teacher.DoesNotExist:
            raise serializers.ValidationError("User is not associated with any teacher.")

        # Resolve school_level name to ID
        school_level_name = validated_data.pop('school_level', None)
        if not school_level_name:
            raise serializers.ValidationError({"school_level": "This field is required."})

        try:
            school_level = SchoolLevel.objects.get(name=school_level_name)
        except SchoolLevel.DoesNotExist:
            raise serializers.ValidationError({"school_level": f"School level '{school_level_name}' does not exist."})

        # Replace the name with the resolved SchoolLevel instance
        validated_data['school_level'] = school_level

        # Extract students
        students = validated_data.pop('students', [])

        # Create the group
        group = Group.objects.create(admin=teacher, **validated_data)

        # Associate students with the group
        group.students.set(students)

        return group

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        representation['students'] = StudentSerializer(instance.students.all(), many=True).data
        representation['school_level'] = instance.school_level.name  # Return the name instead of the ID
        return representation
