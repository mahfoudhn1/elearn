from rest_framework import serializers
from .models import FieldOfStudy, Grade, Group, Schedule, StudentGroupRequest
from users.models import Teacher, Student

class StudentGroupRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudentGroupRequest
        fields = ['id', 'created_at', 'is_accepted', 'is_rejected']

class ScheduleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Schedule
        fields = ['day_of_week', 'start_time', 'end_time']

class fieldofstudySerializer(serializers.ModelSerializer):
    class Meta:
        model = FieldOfStudy
        fields = '__all__'

class gradeSerializer(serializers.ModelSerializer):
    
    school_level = serializers.StringRelatedField()
    class Meta:
        model = Grade
        fields = ['id', 'name', 'school_level' ]


class GroupSerializer(serializers.ModelSerializer):
    students = serializers.StringRelatedField(many=True)
    school_level = serializers.StringRelatedField()  
    grade = serializers.StringRelatedField()
    field_of_study = serializers.StringRelatedField()
    schedule = ScheduleSerializer(many=True)

    class Meta:
        model = Group
        fields = ['id', 'name', 'students', 'school_level', 'grade', 'schedule', 'field_of_study','created_at', 'updated_at', 'status']


    def create(self, validated_data):
        request = self.context['request']
        if request.user.role != "teacher":
            raise serializers.ValidationError("Only teachers can create groups.")

        group = super().create(validated_data)

        students = validated_data.get('students', [])
        group.students.set(students)

        return group