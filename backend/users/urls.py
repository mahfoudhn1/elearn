from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import FieldOfStudysView, GradeViewSet, RegisterView, TeacherProfileView,LogoutViewSet, UserViewSet,AuthViewSet, TeacherViewSet, StudentViewSet, MyTokenObtainPairView, MyTokenRefreshView, GoogleOAuthCallbackViewSet
from django.conf import settings
from django.conf.urls.static import static



router = DefaultRouter()
router.register(r'users', UserViewSet, basename='user')
router.register(r'teacher/profile', TeacherProfileView, basename='teacher-profile')
router.register(r'logout', LogoutViewSet , basename='logout')

router.register(r'register', RegisterView, basename='register')
router.register(r'teachers', TeacherViewSet, basename='teacher')
router.register(r'students', StudentViewSet, basename='student')
router.register(r'fieldofstudy', FieldOfStudysView, basename='fieldofstudy')
router.register(r'grades', GradeViewSet, basename='grades')
router.register(r'auth', AuthViewSet, basename='auth')

router.register(r'auth/callback/google', GoogleOAuthCallbackViewSet, basename='google_callback')



urlpatterns = [
    path('', include(router.urls)),

    path('token/', MyTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', MyTokenRefreshView.as_view(), name='token_refresh'),
]
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)