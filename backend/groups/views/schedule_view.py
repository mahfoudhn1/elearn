from django.forms import ValidationError
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import NotFound
from rest_framework.decorators import action
from rest_framework.response import Response
from jitsi.serializers import MeetingSerializer
from jitsi.views import MeetingViewSet
from jitsi.models import Meeting
from groups.models import Group, Schedule
from groups.serializers import ScheduleSerializer
from users.models import Teacher
from livestream.zoom_service import ZoomOAuthService
import requests
from datetime import datetime, time, timedelta
from django.utils.timezone import now
import uuid

class ScheduleViewSet(viewsets.ModelViewSet):
    serializer_class = ScheduleSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        group_id = self.request.query_params.get('group_id', None)
        scheduled_date = self.request.query_params.get('scheduled_date', None)

        if group_id:
            schedules = Schedule.objects.filter(group=group_id)
        else:
            schedules = Schedule.objects.filter(user=user)
            if scheduled_date:
                schedules = schedules.filter(scheduled_date=scheduled_date)

        for schedule in schedules:
            if schedule.scheduled_date < timezone.now().date():
                next_occurrence = self.get_next_weekday(schedule.day_of_week)
                schedule.scheduled_date = next_occurrence
                # self.create_zoom_meeting(schedule)
                schedule.save()

        return schedules

    def create(self, request, *args, **kwargs):
        user = request.user
        group_id = request.data.get('group_id')
        schedule_type = request.data.get('schedule_type', 'weekly')
        scheduled_date_str = request.data.get('scheduled_date')
        color = request.data.get('color')
        # Check if user is a teacher
        try:
            teacher = Teacher.objects.get(user=user)
        except Teacher.DoesNotExist:
            return Response({"detail": "You are not registered as a teacher."}, 
                            status=status.HTTP_403_FORBIDDEN)

        # Validate group ownership
        group = get_object_or_404(Group, id=group_id)
        if group.admin != teacher:
            return Response({"detail": "You are not authorized to create a schedule for this group."}, 
                            status=status.HTTP_403_FORBIDDEN)

        # Validate schedule type
        if schedule_type not in ['weekly', 'custom']:
            return Response({"detail": "Invalid schedule type. Must be 'weekly' or 'custom'."}, 
                            status=status.HTTP_400_BAD_REQUEST)

        # Validate and parse scheduled_date
        if not scheduled_date_str:
            return Response({"detail": "Scheduled date is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            scheduled_date = datetime.strptime(scheduled_date_str, '%Y-%m-%d').date()
        except ValueError:
            return Response({"detail": "Invalid date format. Use YYYY-MM-DD."}, 
                            status=status.HTTP_400_BAD_REQUEST)

        day_of_week = scheduled_date.strftime('%A').lower()

        if schedule_type == 'weekly':
            next_occurrence = self.get_next_weekday(day_of_week)
            if next_occurrence < now().date():
                next_occurrence += timedelta(days=7)
            scheduled_date = next_occurrence

        try:
            start_time = datetime.strptime(request.data.get('start_time'), '%H:%M').time()
            end_time = datetime.strptime(request.data.get('end_time'), '%H:%M').time()
        except ValueError:
            return Response({"detail": "Invalid time format. Use HH:MM."}, 
                            status=status.HTTP_400_BAD_REQUEST)

        if start_time >= end_time:
            return Response({"detail": "Start time must be before end time."}, 
                            status=status.HTTP_400_BAD_REQUEST)

        meeting = Meeting.objects.create(
            teacher=teacher,
            group=group,
            room_name=f"Room_{teacher.id}_{uuid.uuid4().hex[:6]}",
            start_time=start_time,
            end_time=end_time,
            is_active=True 
        )
        meeting.students.set(group.students.all()) 
        serializer = self.get_serializer(data={
            "user": user.id,
            "group": group_id,
            "schedule_type": schedule_type,
            "scheduled_date": scheduled_date,
            "day_of_week": day_of_week,
            "color":color,
            "start_time": start_time,
            "end_time": end_time,
        })
        serializer.is_valid(raise_exception=True)
        
        schedule = serializer.save()
        
        schedule.Meeting = meeting

        schedule = serializer.save()

        return Response(serializer.data, status=status.HTTP_201_CREATED)


    def destroy(self, request, *args, **kwargs):
        try:
            schedule = self.get_object()
            if schedule.user != request.user:
                return Response({"detail": "Not authorized to delete this schedule."}, status=status.HTTP_403_FORBIDDEN)
            self.perform_destroy(schedule)
            return Response({"detail": "Schedule deleted successfully."}, status=status.HTTP_204_NO_CONTENT)
        except Schedule.DoesNotExist:
            return Response({"detail": "Schedule not found."}, status=status.HTTP_404_NOT_FOUND)

    def get_next_weekday(self, day_of_week):
        days_of_week = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
        today = datetime.now().date()
        current_day = today.weekday()
        target_day = days_of_week.index(day_of_week.lower())
        days_ahead = (target_day - current_day) % 7

        if days_ahead == 0:
            return today 
        return today + timedelta(days=days_ahead)

    def validate_time(self, day_of_week, start_time, end_time):
        if day_of_week in ['friday', 'saturday']:
            if not (start_time >= time(8, 0) and end_time <= time(22, 0)):
                raise ValueError("Open time for Friday and Saturday is from 08:00 to 20:00.")
        else: 
            if not (start_time >= time(12, 0) and end_time <= time(22, 0)):
                raise ValueError("Open time for other days is from 18:00 to 20:00.")
   
    # def create_zoom_meeting(self, schedule):
    #     oauth_service = ZoomOAuthService()
    #     access_token = oauth_service.get_access_token(schedule.user)
    #     start_time = datetime.combine(schedule.scheduled_date, schedule.start_time)
    #     end_time = datetime.combine(schedule.scheduled_date, schedule.end_time)
    #     duration = int((end_time - start_time).total_seconds() / 60) 
    #     headers = {
    #         "Authorization": f"Bearer {access_token}",
    #         "Content-Type": "application/json"
    #     }
    #     meeting_data = {
    #         "topic": "Scheduled Class",
    #         "type": 2,
    #         "start_time": f"{schedule.scheduled_date}T{schedule.start_time}:00Z",  
    #         "duration": duration,  
    #         "timezone": "UTC",
    #         "agenda": "Class Session",
    #     }

    #     response = requests.post('https://api.zoom.us/v2/users/me/meetings', json=meeting_data, headers=headers)

    #     if response.status_code == 201:
    #         meeting_info = response.json()
    #         # Save the meeting ID and join URL to the schedule or another related model
    #         schedule.zoom_meeting_id = meeting_info['id']
    #         schedule.zoom_join_url = meeting_info['join_url']
    #         schedule.save()
    #     else:
    #         print(f"Error creating Zoom meeting: {response.content}")

