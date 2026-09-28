from django.urls import path
from .views import AIInteractionView

urlpatterns = [
    path('interact/', AIInteractionView.as_view(), name='ai-interaction'),
]
