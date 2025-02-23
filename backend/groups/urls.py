from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (ScheduleViewSet, StudentGroupRequestViewSet, TeacherGroupRequestViewSet, GroupViewSet)

router = DefaultRouter()
router.register(r'student-requests', StudentGroupRequestViewSet, basename='student-request')
router.register(r'teacher-requests', TeacherGroupRequestViewSet, basename='teacher-request')
router.register(r'schedules', ScheduleViewSet, basename='schedule')

router.register(r'', GroupViewSet, basename='groups')

urlpatterns = [
    path('', include(router.urls)),

]