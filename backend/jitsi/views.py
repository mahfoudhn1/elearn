from datetime import timedelta
import uuid
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from rest_framework.response import Response
from rest_framework import viewsets,status

from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.decorators import api_view, permission_classes

from privetsessions.models import PrivateSessionRequest
from groups.models import Group
from jitsi.generate_jitsi_token import generate_jitsi_token
from .models import Meeting
from rest_framework.views import APIView
from .serializers import MeetingSerializer

from django.utils import timezone

    
from django.utils import timezone
import uuid

class MeetingViewSet(viewsets.ModelViewSet):
    queryset = Meeting.objects.all()
    serializer_class = MeetingSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # scheduled_date = self.request.query_params.get('scheduled_date')

        group_id = self.request.query_params.get('group_id')
        user = self.request.user
        queryset = Meeting.objects.none()

        if hasattr(user, "teacher"):
            queryset = Meeting.objects.filter(teacher=user.teacher)
        elif hasattr(user, "student"):
            queryset = Meeting.objects.filter(students=user.student)

        if group_id:
            queryset = queryset.filter(group__id=group_id)
        # if scheduled_date:
        #     print(scheduled_date)
        #     queryset = queryset.filter(schedule__scheduled_date=scheduled_date)

        return queryset

    @action(detail=False, methods=['post'])
    def create_meeting(self, request, *args, **kwargs):
        data = request.data  
        user = request.user

        if not hasattr(user, 'teacher'):
            return Response({"error": "Only teachers can create meetings."}, status=status.HTTP_403_FORBIDDEN)

        teacher = user.teacher
        group_id = data.get('group_id')
        group = get_object_or_404(Group, id=group_id)

        room_name = f"Room_{teacher.id}_{uuid.uuid4().hex[:6]}"

        meeting = Meeting.objects.create(
            teacher=teacher,
            room_name=room_name,
            group=group,
            start_time=data.get('start_time'),
            end_time=data.get('end_time'),
            is_active=True  # Meeting is active when created
        )

        meeting.students.set(group.students.all())

        return Response({
            "message": "Meeting created successfully.",
            "meeting": MeetingSerializer(meeting).data
        }, status=status.HTTP_201_CREATED)

    
    @action(detail=True, methods=['GET'])
    def start_meeting(self, request, pk=None):

        try:
            meeting = Meeting.objects.get(id=pk)
        except Meeting.DoesNotExist:
            return Response(
                {"error": "Meeting with the specified roomId does not exist."},
                status=status.HTTP_404_NOT_FOUND
            )

        user = request.user

        if not hasattr(user, 'teacher') or meeting.teacher != user.teacher:
            return Response(
                {"error": "Only the meeting owner can start the meeting."},
                status=status.HTTP_403_FORBIDDEN
            )

        meeting.start_time = timezone.now()
        meeting.is_active = True
        meeting.save() 

        jwt_token = generate_jitsi_token(user, meeting.room_name)

        jitsi_domain = "https://meet.riffaa.com"  
        join_url = f"{jitsi_domain}/{meeting.room_name}?jwt={jwt_token}"

        return Response({
            "message": "Meeting started successfully.",
            "meeting": MeetingSerializer(meeting).data,
            "token": jwt_token,
            "room": meeting.room_name,
            "domain": jitsi_domain,
            "join_url": join_url 
        })


    @action(detail=True, methods=['post'])
    def join_meeting(self, request, pk=None):
        try:
            meeting = Meeting.objects.get(id=pk)
        except Meeting.DoesNotExist:
            return Response(
                {"error": "Meeting with the specified ID does not exist."},
                status=status.HTTP_404_NOT_FOUND
            )

        user = request.user

        # Permission check
        is_teacher = hasattr(user, 'teacher') and meeting.teacher == user.teacher
        is_student = hasattr(user, 'student') and user.student in meeting.students.all()

        if not (is_teacher or is_student):
            return Response(
                {"error": "You don't have permission to join this meeting."},
                status=status.HTTP_403_FORBIDDEN
            )

        # Check if meeting is active
        if not meeting.is_active:
            return Response(
                {"error": "Meeting is not active."},
                status=status.HTTP_400_BAD_REQUEST
            )

        jwt_token = generate_jitsi_token(user, meeting.room_name)
        jitsi_domain = "https://meet.riffaa.com" 
        return Response({
            "message": "Meeting started successfully.",
            "meeting": MeetingSerializer(meeting).data,
            "token": jwt_token,
            "room": meeting.room_name,
            "domain": jitsi_domain,
        })

    @action(detail=True, methods=['post'])
    def close_meeting(self, request, pk=None):
        meeting = self.get_object()
        user = request.user

        if not hasattr(user, 'teacher') or meeting.teacher != user.teacher:
            return Response(
                {"error": "Only the meeting owner can close the meeting."},
                status=status.HTTP_403_FORBIDDEN
            )

        if not meeting.is_active:
            return Response(
                {"error": "Meeting is already closed."},
                status=status.HTTP_400_BAD_REQUEST
            )

        meeting.is_active = False
        meeting.end_time = timezone.now()
        meeting.save()

        return Response({
            "message": "Meeting closed successfully.",
            "meeting": MeetingSerializer(meeting).data
        })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def refresh_jitsi_token(request, meeting_id):
    try:
        meeting = Meeting.objects.get(meeting_id=meeting_id)
        
        # Check if user has access to the meeting
        if request.user.role != 'teacher':  # Use role field instead of hasattr
            if not request.user.groups.filter(id=meeting.group.id).exists():
                return JsonResponse({'error': 'Access denied'}, status=403)
        
        # Generate new token
        token = generate_jitsi_token(
            room_name=meeting.room_name,
            user=request.user,
            meeting=meeting,
            expires_in=7200
        )
        
        return JsonResponse({
            'token': token,
            'expires_at': (timezone.now() + timedelta(seconds=7200)).isoformat()
        })
        
    except Meeting.DoesNotExist:
        return JsonResponse({'error': 'Meeting not found'}, status=404)




