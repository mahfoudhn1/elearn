from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ZoomMeetingViewSet, OAuthViewSet
router = DefaultRouter()

router.register(r'zoom-meetings', ZoomMeetingViewSet, basename='zoommeeting')
router.register(r'oauth', OAuthViewSet, basename='oauth')



urlpatterns = [
    path('', include(router.urls))
]