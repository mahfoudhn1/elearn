from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import FieldOfStudysView, GradeViewSet, ScheduleViewSet, StudentGroupRequestViewSet, TeacherGroupRequestViewSet, GroupViewSet

router = DefaultRouter()
router.register(r'student-requests', StudentGroupRequestViewSet, basename='student-request')
router.register(r'teacher-requests', TeacherGroupRequestViewSet, basename='teacher-request')
router.register(r'schedules', ScheduleViewSet, basename='schedule')
router.register(r'fieldofstudy', FieldOfStudysView, basename='fieldofstudy')
router.register(r'grades', GradeViewSet, basename='grades')
router.register(r'', GroupViewSet, basename='groups')

urlpatterns = [
    path('', include(router.urls)),

]