from rest_framework import serializers
from .models import Group, StudentGroupRequest
from users.models import Teacher, Student

class StudentGroupRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudentGroupRequest
        fields = ['id', 'group', 'created_at', 'is_accepted', 'is_rejected']

class GroupSerializer(serializers.ModelSerializer):
    students = serializers.PrimaryKeyRelatedField(queryset=Student.objects.all(), many=True, required=False, write_only=True)
    status = serializers.CharField(source='get_status_display', read_only=True)  # Assuming `get_status_display` is a method or choice field

    class Meta:
        model = Group
        fields = ['id', 'name', 'students', 'created_at', 'updated_at', 'branch', 'student_class', 'status']
        read_only_fields = ['created_at', 'updated_at', 'status']  

    def create(self, validated_data):
        request = self.context['request']
        if request.user.role != "teacher":
            raise serializers.ValidationError("Only teachers can create groups.")

        group = super().create(validated_data)

        students = validated_data.get('students', [])
        group.students.set(students)

        return group