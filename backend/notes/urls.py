from rest_framework.routers import DefaultRouter
from .views import NoteViewst

router = DefaultRouter()
router.register(r'notes', NoteViewst, basename="NoteViewst")


urlpatterns = [

] + router.urls