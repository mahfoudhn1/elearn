from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from rest_framework.response import Response
from groups.models import StudentGroupRequest
from groups.serializers import StudentGroupRequestSerializer


class TeacherGroupRequestViewSet(viewsets.ModelViewSet):
    serializer_class = StudentGroupRequestSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        request_group_id = self.request.query_params.get('group_id')

        if request_group_id:
            return StudentGroupRequest.objects.filter(group__id=request_group_id)

        return StudentGroupRequest.objects.none()

    def list(self, request):
        queryset = self.get_queryset()
        serializer = StudentGroupRequestSerializer(queryset, many=True)
        return Response(serializer.data)
