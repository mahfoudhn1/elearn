from rest_framework import serializers

from    languagesteaching.models import Language, LanguageLevel
from users.serializers import StudentSerializer, TeacherSerializer
from .models import   Group, GroupCourse, Question, Quiz,   Schedule, StudentAnswer,  StudentGroupRequest, Video
from users.models import Teacher, Student, SchoolLevel
from users.serializers import gradeSerializer, fieldofstudySerializer 
from jitsi.serializers import MeetingSerializer
from jitsi.models import Meeting

from core.serializers import UUIDModelSerializer, UUIDRelatedField
class StudentGroupRequestSerializer(UUIDModelSerializer):
    student = UUIDRelatedField(queryset=Student.objects.all())

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


class ScheduleSerializer(UUIDModelSerializer):
    Meeting = MeetingSerializer(read_only=True, required=False)

    class Meta:
        model = Schedule
        fields = ['id', 'user', 'day_of_week', 'scheduled_date', 'start_time', 'end_time', 'group','color', "Meeting"]



class GroupSerializer(UUIDModelSerializer):
    school_level = serializers.CharField(
        required=False, allow_blank=True, allow_null=True
    )
    admin = serializers.SerializerMethodField(read_only=True)
    field_of_study_nest = fieldofstudySerializer(read_only=True)
    language = serializers.CharField(write_only=True, required=False)
    language_level = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = Group
        fields = [
            'id',
            'admin',
            'name',
            'field_of_study_nest',
            'students',
            'school_level',
            'grade',
            'field_of_study',
            'group_type',
            'language',
            'language_level',
            'created_at',
            'updated_at',
            'status'
        ]
        extra_kwargs = {
            'admin': {'read_only': True},
            'field_of_study_nest': {'read_only': True},
        }

    def create(self, validated_data):
        request = self.context['request']

        # Ensure the user is a teacher
        try:
            teacher = request.user.teacher
        except Teacher.DoesNotExist:
            raise serializers.ValidationError("User is not associated with any teacher.")

        # Resolve school_level name to an instance when provided. Language
        # groups are not attached to a school level, so it stays optional.
        school_level_name = validated_data.pop('school_level', None)
        if school_level_name:
            school_level = SchoolLevel.objects.filter(name=school_level_name).first()
            if school_level is None:
                raise serializers.ValidationError(
                    {"school_level": f"School level '{school_level_name}' does not exist."}
                )
            validated_data['school_level'] = school_level

        # Handle optional language and language_level
        language_id = validated_data.pop('language', None)
        language_level_id = validated_data.pop('language_level', None)

        if language_id:
            try:
                validated_data['language'] = Language.objects.get(uuid=language_id)
            except Language.DoesNotExist:
                raise serializers.ValidationError({"language": f"Language with id '{language_id}' does not exist."})

        if language_level_id:
            try:
                validated_data['language_level'] = LanguageLevel.objects.get(uuid=language_level_id)
            except LanguageLevel.DoesNotExist:
                raise serializers.ValidationError({"language_level": f"Language level with id '{language_level_id}' does not exist."})

        # Extract students
        students = validated_data.pop('students', [])

        # Create the group
        group = Group.objects.create(admin=teacher, **validated_data)

        # Associate students with the group
        group.students.set(students)

        return group


    def get_admin(self, obj):
        return {
            "name": obj.admin.user.get_full_name(),
            "email": obj.admin.user.email,
        }

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        representation['students'] = StudentSerializer(instance.students.all(), many=True).data
        representation['field_of_study_nest'] = getattr(instance.field_of_study, 'name', None)
        representation['school_level'] = instance.school_level.name if instance.school_level else None
        representation['language'] = instance.language.name if instance.language else None
        representation['language_level'] = instance.language_level.name if instance.language_level else None
        return representation


class QuestionSerializer(UUIDModelSerializer):
    class Meta:
        model = Question
        fields = '__all__'
        read_only_fields = ('quiz',)

class QuizSerializer(UUIDModelSerializer):
    questions = QuestionSerializer(many=True, read_only=True)
    
    class Meta:
        model = Quiz
        fields = '__all__'
        read_only_fields = ('teacher', 'created_at', 'updated_at')


class StudentAnswerSerializer(UUIDModelSerializer):
    class Meta:
        model = StudentAnswer
        fields = ['id', 'question', 'selected_answer', 'is_correct']
        read_only_fields = ['is_correct', 'student']

class GroupCourseSerializer(UUIDModelSerializer):
    quiz = QuizSerializer(read_only=True)
    student_answers = StudentAnswerSerializer(many=True, read_only=True)

    class Meta:
        model = GroupCourse
        fields = ['id', 'title', 'description', 'group_video', 'created_at', 'quiz', 'student_answers']

class VideoUploadInitiateSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=255)
    group_id = serializers.UUIDField()
    file_name = serializers.CharField(max_length=255)


class VideoUploadPartSerializer(serializers.Serializer):
    video_id = serializers.UUIDField()
    part_number = serializers.IntegerField()


class VideoUploadCompleteSerializer(serializers.Serializer):
    video_id = serializers.UUIDField()
    r2_object_key = serializers.CharField()

class VideoSerializer(UUIDModelSerializer):
    teacher_name = serializers.CharField(source='teacher.user.get_full_name', read_only=True)
    group_name = serializers.CharField(source='group.name', read_only=True)
    video_url = serializers.SerializerMethodField()

    class Meta:
        model = Video
        fields = [
            'id', 'title', 'created_at', 'teacher_name', 'group_name',
            'upload_status', 'video_url'
        ]
        read_only_fields = fields

    def get_video_url(self, obj):
        from .views.videos_views import generate_presigned_url  # Local import
        if obj.upload_status == Video.UploadStatus.COMPLETED and obj.r2_object_key:
            return generate_presigned_url(obj.r2_object_key)
        return None
