from rest_framework.routers import DefaultRouter
from .views import PrivateSessionRequestViewSet, PrivateSessionViewSet

router = DefaultRouter()
router.register(r'session-requests', PrivateSessionRequestViewSet, basename="privetreq")
router.register(r'', PrivateSessionViewSet, basename="privetSe")

urlpatterns = [
    # other URL patterns
] + router.urls