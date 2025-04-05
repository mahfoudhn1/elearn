from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import  MeetingViewSet, refresh_jitsi_token

router = DefaultRouter()
router.register(r'', MeetingViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('/<uuid:meeting_id>/refresh-token/', refresh_jitsi_token, name='refresh_token'),
    path('/<int:pk>/start_meeting/', MeetingViewSet.as_view({'get': 'start_meeting'})),


]