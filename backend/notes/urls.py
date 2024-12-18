from django.urls import include, path
from rest_framework.routers import DefaultRouter
from .views import NoteViewst

router = DefaultRouter()
router.register(r'', NoteViewst, basename="NoteViewst")

urlpatterns = [
    path('', include(router.urls)),

    path('/subject/<slug:subject>/', NoteViewst.as_view({'get': 'filter_by_subject'}), name='note-by-subject'),
]