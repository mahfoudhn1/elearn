from rest_framework import serializers

from users.serializers import StudentSerializer, TeacherSerializer
from .models import FieldOfStudy, Grade, Group, Schedule, SchoolLevel, StudentGroupRequest
from users.models import Teacher, Student

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
    students = serializers.PrimaryKeyRelatedField(many=True, queryset=Student.objects.all())
    school_level = serializers.PrimaryKeyRelatedField(queryset=SchoolLevel.objects.all())
    grade = gradeSerializer()
    field_of_study = fieldofstudySerializer()
    admin = serializers.PrimaryKeyRelatedField(queryset=Teacher.objects.all())
    class Meta:
        model = Group
        fields = ['id', 'name','admin', 'students', 'school_level', 'grade', 'field_of_study','created_at', 'updated_at', 'status']

    def create(self, validated_data):
        request = self.context['request']
        
        # Fetch the Teacher instance associated with the logged-in user
        try:
            teacher = request.user.teacher  # Accessing the Teacher instance through the User
        except Teacher.DoesNotExist:
            raise serializers.ValidationError("User is not associated with any teacher.")

        # Pop the 'students' and 'schedule' fields from validated_data
        students = validated_data.pop('students', [])
        schedule_data = validated_data.pop('schedule', [])

        # Create the group instance and set the admin to the fetched Teacher
        group = Group.objects.create(admin=teacher, **validated_data)

        # Associate students with the group
        group.students.set(students)

        # Create and associate schedules if provided
        for schedule in schedule_data:
            Schedule.objects.create(group=group, **schedule)

        return group
    
    def to_representation(self, instance):
        representation = super().to_representation(instance)
        representation['students'] = StudentSerializer(instance.students.all(), many=True).data
        return representation

