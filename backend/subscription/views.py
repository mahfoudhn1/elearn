from rest_framework import viewsets, status
from rest_framework.response import Response
from .models import Subscription
from .serializers import SubscriptionSerialize
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from users.models import Student

class SubscriptionViewSet(viewsets.ModelViewSet):
    queryset = Subscription.objects.all()
    serializer_class = SubscriptionSerialize
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save()

    def list(self, request, *args, **kwargs):
        user = request.user
        try:
            student = Student.objects.get(user=user)
        except Student.DoesNotExist:
            return Response({'error': 'The authenticated user is not a student'}, status=status.HTTP_400_BAD_REQUEST)

        subscriptions = Subscription.objects.filter(student=student)
        serializer = self.get_serializer(subscriptions, many=True)
        return Response(serializer.data)

    def update(self, request, *args, **kwargs):

        subscription = self.get_object()
        if subscription.is_active:
            subscription.renew()
            serializer = self.get_serializer(subscription)
            return Response(serializer.data)
        else:
            return Response({'error': 'Subscription is not active'}, status=status.HTTP_400_BAD_REQUEST)