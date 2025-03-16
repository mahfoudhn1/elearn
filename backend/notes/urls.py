from django.urls import include, path
from rest_framework.routers import DefaultRouter
from .views import NoteViewst, TodoViewSet

router = DefaultRouter()
router.register(r'notes', NoteViewst, basename="notes")
router.register(r'todos', TodoViewSet, basename="todo")

urlpatterns = [
    path('', include(router.urls)),
]