from django.urls import path
from .views import (
    CreateSessionRequestView,
    UpdateSessionRequestView,
    PrivateSessionListView,
    CheckSessionPaimentView
)

urlpatterns = [
    path('session-requests/create/', CreateSessionRequestView.as_view({'post': 'create'}), name='create-session-request'),
    path('session-requests/update/<uuid:pk>/', UpdateSessionRequestView.as_view(), name='update-session-request'),
    path('session-requests/list/<uuid:pk>/', PrivateSessionListView.as_view({'get': 'retrieve'}), name='student-session-request'),
    path('session-requests/delete/<uuid:pk>/', PrivateSessionListView.as_view({'get': 'retrieve'}), name='student-session-request'),
    path('session-requests/', PrivateSessionListView.as_view({'get': 'list'}), name='privet-session-requests'),
    path('session-requests/<uuid:pk>/get_jitsi_room_for_session/', 
         PrivateSessionListView.as_view({'get': 'get_jitsi_room_for_session'}), 
         name='get-jitsi-room'),
    path('upload-check/', CheckSessionPaimentView.as_view(), name='CheckSessionPaiment'),

]