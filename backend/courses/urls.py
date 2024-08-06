
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CourseView, SurveyViewSet, LessonViewSet

router = DefaultRouter()
router.register(r'', CourseView, basename='courselist')
router.register(r'lessons', LessonViewSet, basename='lessons')

router.register(r'surveys', SurveyViewSet, basename='survey')



urlpatterns = [
    path('', include(router.urls)),
]
