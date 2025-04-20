from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import ChatMessageViewSet


router = DefaultRouter()
router.register(r'', ChatMessageViewSet, basename='chatmessage')
urlpatterns = [
    path('', include(router.urls)),

]