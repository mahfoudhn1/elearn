from .group_views import GroupViewSet
from .schedule_view import ScheduleViewSet
from .studentreq_views import StudentGroupRequestViewSet
from .teacheres_view import TeacherGroupRequestViewSet
from .video_views import VideoViewSet

__all__=[
    "GroupViewSet",
    "ScheduleViewSet",
    "StudentGroupRequestViewSet",
    "TeacherGroupRequestViewSet",
    "VideoViewSet"   
]