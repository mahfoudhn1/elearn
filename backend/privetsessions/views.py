from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, status, viewsets
from rest_framework.response import Response

from jitsi.models import Meeting
from jitsi.serializers import MeetingSerializer
from .models import CheckSessionPaiment, PrivateSession, PrivateSessionRequest
from .serializers import CheckSessionPaimentSerializer, PrivateSessionRequestSerializer, PrivateSessionSerializer
from users.models import Student, Teacher
from rest_framework.views import APIView
from rest_framework.decorators import action
# Student creates a session request
from rest_framework import status
from rest_framework.response import Response

class CreateSessionRequestView(viewsets.ModelViewSet):
    queryset = PrivateSessionRequest.objects.all()
    serializer_class = PrivateSessionRequestSerializer
    permission_classes = [permissions.IsAuthenticated]

    def create(self, request, *args, **kwargs):
        student = Student.objects.get(user=request.user)
        
        request.data['student_id'] = student.id
        
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

class UpdateSessionRequestView(generics.UpdateAPIView):
    queryset = PrivateSessionRequest.objects.all()
    serializer_class = PrivateSessionRequestSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_update(self, serializer):
        teacher = Teacher.objects.get(user=self.request.user)
        instance = self.get_object()
        if instance.teacher != teacher:
            return Response({"error": "You are not authorized to update this request."}, status=status.HTTP_403_FORBIDDEN)

        if serializer.validated_data.get('status') == 'accepted':
            proposed_date = serializer.validated_data.get('proposed_date')
            if not proposed_date:
                return Response({"error": "Proposed date is required when accepting a request."}, status=status.HTTP_400_BAD_REQUEST)

            # Check if a PrivateSession already exists for this request
            if not PrivateSession.objects.filter(session_request=instance).exists():
                PrivateSession.objects.create(
                    session_request=instance,
                    session_date=proposed_date,
                    paid=False
                )

        serializer.save()
    


# List all session requests for a teacher
class PrivateSessionListView(viewsets.ModelViewSet):
    serializer_class = PrivateSessionRequestSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """
        Return the queryset based on the user's role.
        """
        user = self.request.user
        if user.role == 'student':
            return PrivateSessionRequest.objects.filter(student=user.student)
        elif user.role == 'teacher':
            return PrivateSessionRequest.objects.filter(teacher=user.teacher)
        return PrivateSessionRequest.objects.none()

    def retrieve(self, request, *args, **kwargs):
        """
        Fetch a single PrivateSessionRequest by pk and ensure the user is authorized.
        """
        try:
            instance = self.get_object()  # This uses get_queryset to filter based on user role
            user = self.request.user
            if user.role == 'student' and instance.student != user.student:
                raise PermissionDenied("You do not have permission to access this session.")
            elif user.role == 'teacher' and instance.teacher != user.teacher:
                raise PermissionDenied("You do not have permission to access this session.")
            serializer = self.get_serializer(instance)
            return Response(serializer.data)
        except PrivateSessionRequest.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
    @action(detail=True, methods=['get'])
    def get_jitsi_room_for_session(self, request, pk=None):
        try:
            session_request = self.get_object()
            print(f"Session Request: {session_request}")
            try:
                meeting = Meeting.objects.get(privetsession=session_request)  # Already correct
                return Response({
                    "message": "Meeting found.",
                    "meeting": MeetingSerializer(meeting).data
                })
            except Meeting.DoesNotExist:
                return Response(
                    {"error": "No Jitsi room found for this session."},
                    status=status.HTTP_404_NOT_FOUND
                )
        except PrivateSessionRequest.DoesNotExist:
            return Response(
                {"error": "Session request not found."},
                status=status.HTTP_404_NOT_FOUND
            )

class CheckSessionPaimentView(APIView):

    permission_classes = [permissions.IsAuthenticated]


    def post(self, request, *args, **kwargs):
        privatesession_id = request.data.get('privatesession_id')
        check_image = request.FILES.get('check_image')

        if not privatesession_id or not check_image:
            return Response(
                {"error": "Subscription ID and check image are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        PrivateSession = PrivateSessionRequest.objects.get(id = privatesession_id )
        try:
            check_upload = CheckSessionPaiment.objects.create(
                user=request.user,
                PrivateSession=PrivateSession,
                check_image=check_image,
            )
            serializer = CheckSessionPaimentSerializer(check_upload)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
