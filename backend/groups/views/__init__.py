from .group_views import GroupViewSet
from .schedule_view import ScheduleViewSet
from .studentreq_views import StudentGroupRequestViewSet
from .teacheres_view import TeacherGroupRequestViewSet
from .groupcourse_view import GroupCourseViewSet, StudentAnswerViewSet, QuizViewset
__all__=[
    "GroupViewSet",
    "ScheduleViewSet",
    "StudentGroupRequestViewSet",
    "TeacherGroupRequestViewSet",   
    "GroupCourseViewSet",
    "StudentAnswerViewSet",
    "QuizViewset"
]