from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import *

router = DefaultRouter()
router.register(r'decks', Deckviewset)
router.register(r'', FlashcardViewSet)
router.register(r'progress', DeckProgressViewset)

urlpatterns = [
    path('', include(router.urls)),

]