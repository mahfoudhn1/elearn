from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.views import APIView

from users.serializers import StudentSerializer
from .models import CheckUpload, Subscription, SubscriptionPlan
from .serializers import CheckUploadSerializer, SubscriptionPlanSerializer, SubscriptionSerialize
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from users.models import Student, Teacher
from rest_framework.decorators import action

from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from .models import Subscription, Student, Teacher
from .serializers import SubscriptionSerialize, StudentSerializer

class SubscriptionViewSet(viewsets.ModelViewSet):
    queryset = Subscription.objects.all()
    serializer_class = SubscriptionSerialize
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Ensure users can only access their own subscriptions
        user = self.request.user
        if hasattr(user, 'student'):
            return Subscription.objects.filter(student__user=user)
        elif hasattr(user, 'teacher'):
            return Subscription.objects.filter(teacher__user=user)
        return Subscription.objects.none()

    def retrieve(self, request, *args, **kwargs):

        subscription = self.get_object()
        user = request.user

        # Check if the subscription belongs to the authenticated user
        if hasattr(user, 'student') and subscription.student.user != user:
            return Response({'error': 'You do not have permission to access this subscription'}, status=status.HTTP_403_FORBIDDEN)
        elif hasattr(user, 'teacher') and subscription.teacher.user != user:
            return Response({'error': 'You do not have permission to access this subscription'}, status=status.HTTP_403_FORBIDDEN)

        serializer = self.get_serializer(subscription)
        return Response(serializer.data)

    def list(self, request, *args, **kwargs):
        # Ensure users can only list their own subscriptions
        user = request.user
        if hasattr(user, 'student'):
            subscriptions = Subscription.objects.filter(student__user=user)
        elif hasattr(user, 'teacher'):
            subscriptions = Subscription.objects.filter(teacher__user=user)
        else:
            return Response({'error': 'The authenticated user is not a student or teacher'}, status=status.HTTP_400_BAD_REQUEST)

        serializer = self.get_serializer(subscriptions, many=True)
        return Response(serializer.data)

    def update(self, request, *args, **kwargs):
        # Ensure users can only update their own subscriptions
        subscription = self.get_object()
        user = request.user

        if hasattr(user, 'student') and subscription.student.user != user:
            return Response({'error': 'You do not have permission to update this subscription'}, status=status.HTTP_403_FORBIDDEN)
        elif hasattr(user, 'teacher') and subscription.teacher.user != user:
            return Response({'error': 'You do not have permission to update this subscription'}, status=status.HTTP_403_FORBIDDEN)

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
            teacher = Teacher.objects.get(user=user)
        except Teacher.DoesNotExist:
            return Response({'error': 'The authenticated user is not a teacher'}, status=status.HTTP_400_BAD_REQUEST)

        subscriptions = Subscription.objects.filter(teacher=teacher)
        serializer = SubscriptionSerialize(subscriptions, many=True, context={'request': request})
        return Response(serializer.data)

class subscriptionPlanView(viewsets.ModelViewSet):
    queryset = SubscriptionPlan.objects.all()
    serializer_class = SubscriptionPlanSerializer
    permission_classes = [IsAuthenticated]

class UploadCheckView(APIView):
    permission_classes = [IsAuthenticated]
    def post(self, request, *args, **kwargs):
        subscription_id = request.data.get('subscription_id')
        check_image = request.FILES.get('check_image')

        if not subscription_id or not check_image:
            return Response(
                {"error": "Subscription ID and check image are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            # Create the CheckUpload instance
            check_upload = CheckUpload.objects.create(
                student=request.user,
                subscription_id=subscription_id,
                check_image=check_image,
            )
            serializer = CheckUploadSerializer(check_upload)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)