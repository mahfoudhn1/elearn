from rest_framework import viewsets
from .models import TeacherApplication
from .serializers import TeacherApplicationSerializer
from rest_framework.permissions import AllowAny

from core.views import UUIDLookupMixin
class TeacherApplicationViewSet(UUIDLookupMixin, viewsets.ModelViewSet):
    permission_classes = [AllowAny]
    queryset = TeacherApplication.objects.all().order_by("-submitted_at")
    serializer_class = TeacherApplicationSerializer
