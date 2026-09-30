from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticatedOrReadOnly
from users.models import FieldOfStudy, Grade, SchoolLevel
from users.serializers import fieldofstudySerializer, gradeSerializer


from core.views import UUIDLookupMixin
class FieldOfStudysView(UUIDLookupMixin, viewsets.ModelViewSet):
    queryset = FieldOfStudy.objects.all()
    serializer_class = fieldofstudySerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        queryset = FieldOfStudy.objects.select_related("grade", "grade__school_level")
        grade_id = self.request.query_params.get("grade")
        school_level_name = self.request.query_params.get("school_level")

        if grade_id:
            queryset = queryset.filter(grade__uuid=grade_id)
        elif school_level_name:
            queryset = queryset.filter(grade__school_level__name=school_level_name)

        return queryset


class GradeViewSet(UUIDLookupMixin, viewsets.ModelViewSet):
    queryset = Grade.objects.all()
    serializer_class = gradeSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        school_level_name = self.request.query_params.get('school_level')

        if school_level_name:
            return Grade.objects.filter(school_level__name=school_level_name)

        return Grade.objects.all()
