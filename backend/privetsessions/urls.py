from django.urls import path
from .views import (
    CreateSessionRequestView,
    UpdateSessionRequestView,
    PrivateSessionListView,
)

urlpatterns = [
    path('session-requests/create/', CreateSessionRequestView.as_view({'post': 'create'}), name='create-session-request'),
    path('session-requests/update/<int:pk>/', UpdateSessionRequestView.as_view(), name='update-session-request'),
    path('session-requests/list/<int:pk>/', PrivateSessionListView.as_view({'get': 'retrieve'}), name='student-session-request'),
    path('session-requests/delete/<int:pk>/', PrivateSessionListView.as_view({'get': 'retrieve'}), name='student-session-request'),
    path('session-requests/', PrivateSessionListView.as_view({'get': 'list'}), name='privet-session-requests'),
]