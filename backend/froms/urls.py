from rest_framework.routers import DefaultRouter
from .views import TeacherApplicationViewSet

router = DefaultRouter()
#router.register(r"", TeacherApplicationViewSet, basename="teacherform")

urlpatterns = router.urls
