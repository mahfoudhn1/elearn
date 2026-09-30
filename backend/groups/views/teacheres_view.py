from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from rest_framework.response import Response
from groups.models import StudentGroupRequest
from groups.serializers import StudentGroupRequestSerializer
from users.models import Teacher


from core.views import UUIDLookupMixin
class TeacherGroupRequestViewSet(UUIDLookupMixin, viewsets.ModelViewSet):
    serializer_class = StudentGroupRequestSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        try:
            teacher = self.request.user.teacher
        except Teacher.DoesNotExist:
            return StudentGroupRequest.objects.none()

        queryset = StudentGroupRequest.objects.filter(group__admin=teacher)

        request_group_id = self.request.query_params.get('group_id')
        if request_group_id:
            queryset = queryset.filter(group__uuid=request_group_id)

        return queryset.select_related('student__user', 'group')

    def list(self, request):
        queryset = self.get_queryset()
        serializer = StudentGroupRequestSerializer(queryset, many=True)
        return Response(serializer.data)
