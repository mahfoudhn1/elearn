from rest_framework import serializers
from .models import Course, Lesson, Survey, UserLessonProgress


class LessonSerializer(serializers.ModelSerializer):
    
    is_finished = serializers.SerializerMethodField()

    class Meta:
        model = Lesson
        fields = ['id', 'title', 'description', 'video', 'order', 'is_finished']
    
    def create(self, validated_data):
        return Lesson.objects.create(**validated_data)
    
    def get_is_finished(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            user = request.user
            return UserLessonProgress.objects.filter(user=user, lesson=obj, is_finished=True).exists()
        return False
    
    def update(self, instance, validated_data):
        instance.course = validated_data.get('course', instance.course)
        instance.title = validated_data.get('title', instance.title)
        instance.description = validated_data.get('description', instance.description)
        instance.video = validated_data.get('video', instance.video)
        instance.order = validated_data.get('order', instance.order)
        instance.save()
        return instance

class SurveySerializer(serializers.ModelSerializer):
    class Meta:
        model = Survey
        fields = ['id', 'lesson', 'question', 'student_answer']

class CourseSerializer(serializers.ModelSerializer):
    lessons = LessonSerializer(many=True, read_only=True)
    progress = serializers.SerializerMethodField()

    class Meta:
        model = Course
        fields= ["id","title", "descitption", "course_class", "course_branch", "lessons", "progress"]

    def create(self, validated_data):
        return Course.objects.create(**validated_data)
    
    def get_progress(self, obj):
        return obj.calculate_progress()