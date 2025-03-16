from rest_framework import viewsets, status
from rest_framework.response import Response

from users.serializers import StudentSerializer
from .models import Subscription, SubscriptionPlan
from .serializers import SubscriptionPlanSerializer, SubscriptionSerialize
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from users.models import Student, Teacher
from rest_framework.decorators import action

class SubscriptionViewSet(viewsets.ModelViewSet):
    queryset = Subscription.objects.all()
    serializer_class = SubscriptionSerialize
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
            serializer = SubscriptionSerialize(data=request.data, context={'request': request})
            if serializer.is_valid():
                subscription = serializer.save()
                return Response(SubscriptionSerialize(subscription).data, status=status.HTTP_201_CREATED)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

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
            subscription.activate()  
            subscription.renew()
            serializer = self.get_serializer(subscription)
            return Response(serializer.data)
        else:
            return Response({'error': 'Subscription is not active'}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def subscribed_students(self, request):
        user = request.user
        try:
            teacher = Teacher.objects.get(user=user)
        except Teacher.DoesNotExist:
            return Response({'error': 'The authenticated user is not a teacher'}, status=status.HTTP_400_BAD_REQUEST)

        subscriptions = Subscription.objects.filter(teacher=teacher)

        students = [subscription.student for subscription in subscriptions]

        serializer = StudentSerializer(students, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def filtered_subscribed_students(self, request):
        user = request.user
        try:
            teacher = Teacher.objects.get(user=user)
        except Teacher.DoesNotExist:
            return Response({'error': 'The authenticated user is not a teacher'}, status=status.HTTP_400_BAD_REQUEST)

        student_ids = request.data.get('student_ids', [])
        if not student_ids:
            return Response({'error': 'No student IDs provided'}, status=status.HTTP_400_BAD_REQUEST)

        subscriptions = Subscription.objects.filter(teacher=teacher, student__id__in=student_ids)
        
        serializer = SubscriptionSerialize(subscriptions, many=True)

        return Response(serializer.data)
    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def teacher_subscriptions(self, request):

        user = request.user

        try:
            # Ensure the authenticated user is a teacher
            teacher = Teacher.objects.get(user=user)
            print(teacher)
        except Teacher.DoesNotExist:
            return Response(
                {'error': 'The authenticated user is not a teacher'},
                status=status.HTTP_400_BAD_REQUEST
            )

        subscriptions = Subscription.objects.filter(teacher=teacher)
        print(subscriptions)
        serializer = SubscriptionSerialize(subscriptions, many=True, context={'request': request})

        return Response(serializer.data)

class subscriptionPlanView(viewsets.ModelViewSet):
    queryset = SubscriptionPlan.objects.all()
    serializer_class = SubscriptionPlanSerializer
    permission_classes = [IsAuthenticated]