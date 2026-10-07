from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .teacher_views import (
    CalibrationReportView,
    ItemAnalysisView,
    TeacherClassAnalyticsView,
    TeacherClassesView,
    TeacherGradeView,
    TeacherOverviewAnalyticsView,
)
from .views import (
    AttemptAnswerView,
    AttemptNextView,
    AttemptResultView,
    AttemptStartView,
    AttemptSubmitView,
    ChapterReadinessListView,
    CurriculumTopicsView,
    FlashcardDueView,
    FlashcardsRuleSetViewSet,
    FlashcardReviewView,
    FlashcardStatsView,
    FlashcardViewSet,
    MasteryRuleSetViewSet,
    MisconceptionViewSet,
    QuestionViewSet,
    QuizViewSet,
    ReadinessOverviewView,
    StaffQuestionImportView,
    SubjectReadinessView,
    TopicMasteryListView,
)

router = DefaultRouter()
router.register(r"questions", QuestionViewSet, basename="assessment-question")
router.register(r"misconceptions", MisconceptionViewSet, basename="assessment-misconception")
router.register(r"quizzes", QuizViewSet, basename="assessment-quiz")
router.register(r"mastery-rules", MasteryRuleSetViewSet, basename="assessment-mastery-rules")
router.register(r"flashcards", FlashcardViewSet, basename="assessment-flashcard")
router.register(
    r"flashcard-rules", FlashcardsRuleSetViewSet, basename="assessment-flashcard-rules"
)

urlpatterns = [
    path("staff/import/", StaffQuestionImportView.as_view(), name="assessment-staff-import"),
    path("mastery/topics/", TopicMasteryListView.as_view(), name="assessment-mastery-topics"),
    path("mastery/chapters/", ChapterReadinessListView.as_view(), name="assessment-mastery-chapters"),
    path("readiness/overview/", ReadinessOverviewView.as_view(), name="assessment-readiness-overview"),
    path("curriculum/", CurriculumTopicsView.as_view(), name="assessment-curriculum"),
    path("teacher/classes/", TeacherClassesView.as_view(), name="assessment-teacher-classes"),
    path(
        "teacher/analytics/",
        TeacherOverviewAnalyticsView.as_view(),
        name="assessment-teacher-analytics",
    ),
    path(
        "teacher/classes/<uuid:group_id>/analytics/",
        TeacherClassAnalyticsView.as_view(),
        name="assessment-teacher-class-analytics",
    ),
    path("teacher/grades/", TeacherGradeView.as_view(), name="assessment-teacher-grades"),
    path("item-analysis/", ItemAnalysisView.as_view(), name="assessment-item-analysis"),
    path(
        "staff/calibration/",
        CalibrationReportView.as_view(),
        name="assessment-staff-calibration",
    ),
    path(
        "readiness/subject/<str:subject>/",
        SubjectReadinessView.as_view(),
        name="assessment-readiness-subject",
    ),
    path("flashcards/due/", FlashcardDueView.as_view(), name="assessment-flashcards-due"),
    path("flashcards/stats/", FlashcardStatsView.as_view(), name="assessment-flashcards-stats"),
    path(
        "flashcards/<uuid:pk>/review/",
        FlashcardReviewView.as_view(),
        name="assessment-flashcard-review",
    ),
    path("attempts/start/", AttemptStartView.as_view(), name="assessment-attempt-start"),
    path(
        "attempts/<uuid:pk>/answer/",
        AttemptAnswerView.as_view(),
        name="assessment-attempt-answer",
    ),
    path(
        "attempts/<uuid:pk>/submit/",
        AttemptSubmitView.as_view(),
        name="assessment-attempt-submit",
    ),
    path(
        "attempts/<uuid:pk>/next/",
        AttemptNextView.as_view(),
        name="assessment-attempt-next",
    ),
    path(
        "attempts/<uuid:pk>/result/",
        AttemptResultView.as_view(),
        name="assessment-attempt-result",
    ),
    path("", include(router.urls)),
]
