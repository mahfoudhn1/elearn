from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated
from users.models import FieldOfStudy, Grade, SchoolLevel
from users.serializers import fieldofstudySerializer, gradeSerializer


class FieldOfStudysView(viewsets.ModelViewSet):
    queryset = FieldOfStudy.objects.all()
    serializer_class = fieldofstudySerializer
    permission_classes = [IsAuthenticated]
    

class GradeViewSet(viewsets.ModelViewSet):
    queryset = Grade.objects.all()
    serializer_class = gradeSerializer  

    def get_queryset(self):
        school_level_name = self.request.query_params.get('school_level')
        
        if school_level_name:
            try:
                school_level = SchoolLevel.objects.get(name=school_level_name)

                return Grade.objects.filter(school_level=school_level.id)
            except SchoolLevel.DoesNotExist:
                return Grade.objects.all()
        

        return Grade.objects.all()
