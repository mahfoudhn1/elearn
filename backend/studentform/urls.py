from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import StudentFormViewSet

router = DefaultRouter()
router.register(r'', StudentFormViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
