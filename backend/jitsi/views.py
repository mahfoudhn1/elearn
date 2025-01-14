from django.http import JsonResponse
from rest_framework.response import Response
from rest_framework import viewsets

from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework import status
from rest_framework.exceptions import PermissionDenied
from jitsi.generate_jitsi_token import generate_jitsi_token
from .models import Meeting
from rest_framework.views import APIView
from .serializers import MeetingSerializer
import random
import string


    
class MeetingViewset(viewsets.ViewSet):
    queryset = Meeting.objects.all()
    serializer_class = MeetingSerializer
    permission_classes = [IsAuthenticated]
    
    def generate_room_name(self):
    # Generate a random room name (or use your own logic to define it)
        return ''.join(random.choices(string.ascii_lowercase + string.digits, k=10))

    @action(detail=True, methods=['GET'])
    def get_room_and_token(self, request, pk=None):
        try:
            meeting = Meeting.objects.get(id=pk)
            user = request.user

            if user.role != "teacher":
                return Response({"error": "Only teachers can access this endpoint"}, status=403)

            serializer = MeetingSerializer(meeting)
            room_url = f"https://meet.jit.si/{meeting.room_name}"

            # Generate the Jitsi token
            token = generate_jitsi_token(user, meeting.room_name)

            # Create response and set the token as a cookie
            response = JsonResponse({
                "room_url": room_url,
                "meeting": serializer.data
            })
            response.set_cookie(
                key="jitsi_token",
                value=token,
                httponly=False,  # Make it HTTP-only for security
                secure=False,  # Use True in production with HTTPS
                samesite="Lax",  # Adjust based on your requirements
            )
            return response
        except Meeting.DoesNotExist:
            return Response({"error": "Meeting not found"}, status=404)

    @action(detail=False, methods=['POST'])
    def create_room(self, request):
        user = request.user
        if not hasattr(user, 'teacher'):
            return Response({"error": "Authenticated user is not a teacher"}, status=status.HTTP_400_BAD_REQUEST)

        teacher = user.teacher 

        room_name = self.generate_room_name()
        meeting = Meeting.objects.create(
            teacher=teacher,
            room_name=room_name
        )
        meeting.save()

        room_url = f"https://meet.jit.si/{room_name}" 
        return Response({"room_url": room_url, "room_name": room_name, "meeting_id": meeting.id}, status=status.HTTP_201_CREATED)