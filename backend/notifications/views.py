from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from .models import Notification
from .serializers import NotificationSerializer
from rest_framework.decorators import action

class NotificationViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def list(self, request):
        notifications = Notification.objects.filter(
            recipient=request.user
        ).order_by('-created_at')
        serializer = NotificationSerializer(notifications, many=True)

        Notification.objects.filter(
            recipient=request.user, is_seen=False
        ).update(is_seen=True)

        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def counter(self, request):
 
        count = Notification.objects.filter(
            recipient=request.user, is_seen=False
        ).count()
        return Response({"count": count})

    def update(self,request, pk):
        notification = Notification.objects.get(uuid=pk, recipient=request.user)
        if notification is None:
            return Response(
                {"error": "Notification not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = NotificationSerializer(notification, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)