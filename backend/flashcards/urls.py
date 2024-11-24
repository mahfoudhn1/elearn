from django.urls import path, include
from rest_framework.routers import DefaultRouter
from flashcards.views import FlashcardCollectionViewSet, FlashcardViewSet


router = DefaultRouter()
router.register(r'flashcards', FlashcardViewSet,  basename='flashcard')
router.register(r'flashcardcollection', FlashcardCollectionViewSet, basename='flashcardcollection')

urlpatterns = [
    path('', include(router.urls)),

]