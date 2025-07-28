from django.urls import path
from .views import LanguageLevelViewset, LanguageTestQuestionsView, LanguageViewset, StudentLanguageProficiencyViewSet, SubmitTestView

urlpatterns = [
    path('tests/<int:language_id>/questions/', LanguageTestQuestionsView.as_view(), name='test-questions'),
    path('languages/', LanguageViewset.as_view({'get': 'list'}), name='languages'),
    path('language-level/', LanguageLevelViewset.as_view({'get': 'list'}), name='language-level'),
    
    path('language-proficiencies/', StudentLanguageProficiencyViewSet.as_view({'get': 'list'}), name='language-proficiencies'),
    path('tests/submit/', SubmitTestView.as_view(), name='submit-test'),
]