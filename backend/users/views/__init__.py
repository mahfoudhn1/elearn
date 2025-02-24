from .auth_views import AuthViewSet, MyTokenRefreshView, MyTokenObtainPairView, RegisterView, LogoutViewSet
from .googleauth_views import GoogleOAuthCallbackViewSet
from .users_views import UserViewSet, TeacherProfileView, TeacherViewSet, StudentViewSet 
from .field_grade_views import FieldOfStudysView, GradeViewSet


__all__ = [
    "AuthViewSet",
    "MyTokenRefreshView",
    "MyTokenObtainPairView",
    "RegisterView",
    "LogoutViewSet",
    "GoogleOAuthCallbackViewSet",
    "UserViewSet",
    "TeacherProfileView",
    "TeacherViewSet",
    "StudentViewSet ",
    "FieldOfStudysView",
    "GradeViewSet"

]
