from django.urls import include, path
from rest_framework.routers import SimpleRouter

from .views import VideoAssetViewSet

router = SimpleRouter()
router.register(r"videos", VideoAssetViewSet, basename="video-asset")

urlpatterns = [
    path("", include(router.urls)),
]
