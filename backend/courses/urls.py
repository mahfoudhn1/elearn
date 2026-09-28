from django.urls import include, path
from rest_framework.routers import SimpleRouter

from .views import CourseViewSet, LessonViewSet, MaterialViewSet, SurveyViewSet

router = SimpleRouter()
router.register(r"lessons", LessonViewSet, basename="lesson")
router.register(r"materials", MaterialViewSet, basename="material")
router.register(r"surveys", SurveyViewSet, basename="survey")

course_list = CourseViewSet.as_view({"get": "list", "post": "create"})
course_detail = CourseViewSet.as_view(
    {
        "get": "retrieve",
        "put": "update",
        "patch": "partial_update",
        "delete": "destroy",
    }
)

urlpatterns = [
    path("", course_list, name="course-list"),
    path("<uuid:pk>/", course_detail, name="course-detail"),
    path("", include(router.urls)),
]
