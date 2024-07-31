from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import RegisterView, AuthViewSet, UserViewSet, TeacherViewSet, StudentViewSet, ModuleViewSet, GradeViewSet, SpecialityViewSet, MyTokenObtainPairView, MyTokenRefreshView

router = DefaultRouter()
router.register(r'users', UserViewSet, basename='user')
router.register(r'register', RegisterView, basename='register')
router.register(r'teachers', TeacherViewSet, basename='teacher')
router.register(r'students', StudentViewSet, basename='student')
router.register(r'modules', ModuleViewSet, basename='module')
router.register(r'grades', GradeViewSet, basename='grade')
router.register(r'specialities', SpecialityViewSet, basename='specialitie')
router.register(r'auth', AuthViewSet, basename='auth')



urlpatterns = [
    path('', include(router.urls)),
    path('token/', MyTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', MyTokenRefreshView.as_view(), name='token_refresh'),
]
