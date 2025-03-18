from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SubscriptionViewSet, UploadCheckView

router = DefaultRouter()
router.register(r'subscriptions', SubscriptionViewSet, basename='subscription')
# router.register(r'upload-check', UploadCheckView, basename='upload-check')


urlpatterns = [
    path('', include(router.urls)),
    path('upload-check/', UploadCheckView.as_view(), name='upload-check'),
  
]
