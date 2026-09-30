from django.urls import include, path
from rest_framework.routers import SimpleRouter

from .views import (
    CourseViewSet,
    LessonViewSet,
    MaterialViewSet,
    SectionViewSet,
    SurveyViewSet,
)

router = SimpleRouter()
router.register(r"sections", SectionViewSet, basename="section")
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
course_reorder = CourseViewSet.as_view({"post": "reorder"})

urlpatterns = [
    path("", course_list, name="course-list"),
    path("<uuid:pk>/", course_detail, name="course-detail"),
    path("<uuid:pk>/reorder/", course_reorder, name="course-reorder"),
    path("", include(router.urls)),
]
