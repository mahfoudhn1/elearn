from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (ScheduleViewSet, GroupCourseViewSet, StudentAnswerViewSet, QuizViewset, StudentGroupRequestViewSet, TeacherGroupRequestViewSet, GroupViewSet)

router = DefaultRouter()
router.register(r'student-requests', StudentGroupRequestViewSet, basename='student-request')
router.register(r'teacher-requests', TeacherGroupRequestViewSet, basename='teacher-request')
router.register(r'schedules', ScheduleViewSet, basename='schedule')
router.register(r'courses', GroupCourseViewSet, basename='courses') 
router.register(r'quiz', QuizViewset, basename='survet') 
router.register(r'studentanswer', StudentAnswerViewSet, basename='studentasw') 
router.register(r'', GroupViewSet, basename='groups')

urlpatterns = [
    path('', include(router.urls)),

]