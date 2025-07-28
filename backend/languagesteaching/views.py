# assessments/views.py
from django.shortcuts import get_object_or_404
from rest_framework import generics, status, viewsets
from rest_framework.response import Response

from users.models import Student
from .models import LanguageLevel, Question, StudentLanguageProficiency
from .serializers import LanguageLevelSerializer, LanguageSerializer, QuestionSerializer, StudentLanguageProficiencySerializer, TestSubmissionSerializer
from .models import Language
from rest_framework.pagination import PageNumberPagination

class LanguageViewset(viewsets.ModelViewSet):
    serializer_class = LanguageSerializer

    def get_queryset(self):
        return Language.objects.all()

class LanguageLevelViewset(viewsets.ModelViewSet):
    serializer_class = LanguageLevelSerializer
    
    def get_queryset(self):
        print(LanguageLevel.objects.all())
        return LanguageLevel.objects.all()
    
class QuestionPagination(PageNumberPagination):
    page_size = 10  # default per page
    page_size_query_param = 'page_size'
    max_page_size = 50

class LanguageTestQuestionsView(generics.ListAPIView):
    serializer_class = QuestionSerializer
    pagination_class = QuestionPagination

    def get_queryset(self):
        language_id = self.kwargs.get('language_id')
        print(Language.objects.all().values())
        language = get_object_or_404(Language, id=18)
        print(language_id)
        print(language)
        return Question.objects.filter(language=18).order_by('id')

class SubmitTestView(generics.CreateAPIView):
    serializer_class = TestSubmissionSerializer
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = serializer.save()
        return Response({
            'message': 'Test submitted successfully',
            'score': result['score'],
            'level': result['level_name'],  # Use level_name instead of level object
            'language': result['language_name'],
            'proficiency_id': result['proficiency'].id,
        }, status=status.HTTP_201_CREATED)

class StudentLanguageProficiencyViewSet(viewsets.ModelViewSet):
    serializer_class = StudentLanguageProficiencySerializer

    def get_queryset(self):
        user = self.request.user
        print(StudentLanguageProficiency.objects.filter(student__user=user))
        if user.is_staff:
            return StudentLanguageProficiency.objects.all()
        return StudentLanguageProficiency.objects.filter(student__user=user)

    def perform_create(self, serializer):
        serializer.save(student=self.request.user.student)
