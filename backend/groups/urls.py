from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import StudentGroupRequestViewSet, TeacherGroupRequestViewSet, GroupViewSet

router = DefaultRouter()
router.register(r'student-requests', StudentGroupRequestViewSet, basename='student-request')
router.register(r'teacher-requests', TeacherGroupRequestViewSet, basename='teacher-request')
router.register(r'', GroupViewSet, basename='group')

urlpatterns = [
    path('', include(router.urls)),
]