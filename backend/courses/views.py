from rest_framework import status
from rest_framework.response import Response
from rest_framework.decorators import action

from rest_framework import viewsets
from .models import *
from .serializers import *
from rest_framework.permissions import IsAuthenticated

class CourseView(viewsets.ModelViewSet):
    queryset = Course.objects.all()
    serializer_class = CourseSerializer


class LessonViewSet(viewsets.ModelViewSet):
    queryset = Lesson.objects.all()
    serializer_class = LessonSerializer

    
    @action(detail=False, methods=['get'])
    def by_course(self, request):
        course_id = request.query_params.get('course_id')
        if course_id:
            lessons = Lesson.objects.filter(course_id=course_id)
            serializer = LessonSerializer(lessons, many=True)
            return Response(serializer.data)
        return Response({'error': 'course_id parameter is required'}, status=400)
    
    @action(detail=True, methods=['post'])
    def mark_as_finished(self, request, pk=None):
        lesson = self.get_object()
        user = request.user  

        progress, created = UserLessonProgress.objects.update_or_create(
            user=user,
            lesson=lesson,
            defaults={'is_finished': True}
        )
        
        return Response({'status': 'Lesson marked as finished', 'created': created})
    
class SurveyViewSet(viewsets.ModelViewSet):
    queryset = Survey.objects.all()
    serializer_class = SurveySerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        lesson_id = self.request.query_params.get('lesson', None)
        if lesson_id:
            queryset = queryset.filter(lesson_id=lesson_id)
        return queryset

    @action(detail=False, methods=['get'])
    def by_lesson(self, request):
        lesson_id = request.query_params.get('lesson', None)
        if not lesson_id:
            return Response({'error': 'Lesson ID is required'}, status=400)

        surveys = Survey.objects.filter(lesson_id=lesson_id)
        serializer = self.get_serializer(surveys, many=True)
        return Response(serializer.data)

    def update(self, request, *args, **kwargs):
        survey = self.get_object()
        student_answer = request.data.get('student_answer', '')

        survey.student_answer = student_answer
        survey.save()

        if survey.is_correct():
            message = 'Correct!'
        else:
            message = 'Incorrect. Please review the lesson.'

        return Response({'message': message})
