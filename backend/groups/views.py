from django.shortcuts import get_object_or_404
from rest_framework.response import Response
from datetime import datetime, time, timedelta

from rest_framework import viewsets
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied
from rest_framework.decorators import action
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.exceptions import NotFound

from livestream.models import ZoomMeeting
from livestream.zoom_service import ZoomOAuthService
from users.serializers import StudentSerializer
import requests

from .serializers import * 
from .models import *
from users.models import Student, Teacher

class GroupViewSet(viewsets.ModelViewSet):
    serializer_class = GroupSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user  
        field_of_study_id = self.request.query_params.get('field_of_study', None) 

        queryset = Group.objects.all()  

        if field_of_study_id:
            queryset = queryset.filter(field_of_study=field_of_study_id)
        if user.role == 'teacher':
            try:
                teacher = user.teacher  
                queryset = queryset.filter(admin=teacher)
            except Teacher.DoesNotExist:
                return Group.objects.none()

        return queryset
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def add_student_to_group(self, request, pk=None):
        group_id = pk  # Get group ID from URL parameters
        student_id = request.data.get('student_id')

        try:
            # Fetch the group and student
            group = Group.objects.get(id=group_id)
            student = Student.objects.get(id=student_id)


            group.students.add(student)

            return Response({'success': 'Student added to group successfully.'}, status=status.HTTP_200_OK)
        except Group.DoesNotExist:
            return Response({'error': 'Group not found.'}, status=status.HTTP_404_NOT_FOUND)
        except Student.DoesNotExist:
            return Response({'error': 'Student not found.'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['delete'], permission_classes=[IsAuthenticated])
    def remove_student(self, request, pk=None):
        try:
            group = self.get_object()  
            student_id = request.data.get('student_id') 
            
            if not student_id:
                return Response({'error': 'Student ID is required'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Assuming you have a Many-to-Many relationship between Group and Student
            try:
                student = group.students.get(id=student_id)  # Get the student from the group
                group.students.remove(student)  # Remove the student from the group
                return Response({'message': 'Student removed from group successfully'}, status=status.HTTP_204_NO_CONTENT)
            except Student.DoesNotExist:
                return Response({'error': 'Student not found in this group'}, status=status.HTTP_404_NOT_FOUND)

        except Group.DoesNotExist:
            return Response({'error': 'Group not found'}, status=status.HTTP_404_NOT_FOUND)
    
    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def Noroup_students(self, request):
        user = request.user
        group_id = request.query_params.get('group_id', None)

        if not group_id:
            return Response({'error': 'group_id parameter is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            group = Group.objects.get(id=group_id)
        except Group.DoesNotExist:
            return Response({'error': 'Group not found'}, status=status.HTTP_404_NOT_FOUND)

        try:
            teacher = Teacher.objects.get(user=user)
        except Teacher.DoesNotExist:
            return Response({'error': 'The authenticated user is not a teacher'}, status=status.HTTP_400_BAD_REQUEST)

        # Fetch active subscriptions where students don't belong to any group
        subscriptions = Subscription.objects.filter(
            teacher=teacher,
            is_active=True,
            student__group__isnull=True
        )

        subscriptions = subscriptions.filter(
            student__school_level=group.school_level,
            student__grade=group.grade
        )

        students = [subscription.student for subscription in subscriptions]

        serializer = StudentSerializer(students, many=True)
        return Response(serializer.data)






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
                self.create_zoom_meeting(schedule)
                schedule.save()

        return schedules


    
    def create(self, request, *args, **kwargs):
        user = request.user
        group_id = request.data.get('group_id')
        group = get_object_or_404(Group, id=group_id)

        try:
            teacher = Teacher.objects.get(user=user)
            if group.admin != teacher:
                return Response({"detail": "You are not authorized to create a schedule for this group."}, 
                                status=status.HTTP_403_FORBIDDEN)
        except Teacher.DoesNotExist:
            return Response({"detail": "You are not registered as a teacher."}, 
                            status=status.HTTP_403_FORBIDDEN)

        data = request.data.copy()
        schedule_type = data.get('schedule_type', 'weekly')

        if schedule_type not in ['weekly', 'custom']:
            return Response({"detail": "Invalid schedule type. Must be 'weekly' or 'one-time'."}, status=status.HTTP_400_BAD_REQUEST)

        scheduled_date = data.get('scheduled_date')
        if not scheduled_date:
            return Response({"detail": "Scheduled date is required."}, status=status.HTTP_400_BAD_REQUEST)

        scheduled_date = datetime.strptime(scheduled_date, '%Y-%m-%d').date()
        day_of_week = scheduled_date.strftime('%A').lower()
        data['day_of_week'] = day_of_week
        if schedule_type == 'weekly':
            next_occurrence = self.get_next_weekday(day_of_week)
            if next_occurrence < datetime.now().date():
                next_occurrence += timedelta(days=7)
            data['scheduled_date'] = next_occurrence.strftime('%Y-%m-%d')
        else:
            data['scheduled_date'] = scheduled_date.strftime('%Y-%m-%d')

        start_time = datetime.strptime(data.get('start_time'), '%H:%M').time()
        end_time = datetime.strptime(data.get('end_time'), '%H:%M').time()

        # Validate time restrictions
        self.validate_time(day_of_week, start_time, end_time)

        data['user'] = user.id
        data['group'] = group_id
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)

        self.create_zoom_meeting(serializer.instance)

        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def perform_create(self, serializer):
        serializer.save()
    
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
            if not (start_time >= time(18, 0) and end_time <= time(22, 0)):
                raise ValueError("Open time for other days is from 18:00 to 20:00.")

    def create_zoom_meeting(self, schedule):
        oauth_service = ZoomOAuthService()
        access_token = oauth_service.get_access_token(schedule.user)
        start_time = datetime.combine(schedule.scheduled_date, schedule.start_time)
        end_time = datetime.combine(schedule.scheduled_date, schedule.end_time)
        duration = int((end_time - start_time).total_seconds() / 60) 
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }
        meeting_data = {
            "topic": "Scheduled Class",
            "type": 2,
            "start_time": f"{schedule.scheduled_date}T{schedule.start_time}:00Z",  
            "duration": duration,  
            "timezone": "UTC",
            "agenda": "Class Session",
        }

        response = requests.post('https://api.zoom.us/v2/users/me/meetings', json=meeting_data, headers=headers)

        if response.status_code == 201:
            meeting_info = response.json()
            # Save the meeting ID and join URL to the schedule or another related model
            schedule.zoom_meeting_id = meeting_info['id']
            schedule.zoom_join_url = meeting_info['join_url']
            schedule.save()
        else:
            print(f"Error creating Zoom meeting: {response.content}")



class StudentGroupRequestViewSet(viewsets.ModelViewSet):
    queryset = StudentGroupRequest.objects.all()
    serializer_class = StudentGroupRequestSerializer
    permission_classes = [IsAuthenticated]

    def create(self, request, *args, **kwargs):
        if request.user.role != 'student':
            raise serializers.ValidationError("Only students can send group join requests.")
        user = self.request.user

        try:
            student = Student.objects.get(user=user)
        except Student.DoesNotExist:
            raise serializers.ValidationError("User does not have an associated Student instance.")

        group_id = request.data.get('group_id')
        if not group_id:
            raise serializers.ValidationError("Group ID must be provided.")
        
        try:
            group = Group.objects.get(id=group_id)
            teacher = group.admin 
            if not teacher:
                raise serializers.ValidationError("Group does not have an associated teacher.")

            subscription_exists = Subscription.objects.filter(student=student, teacher=teacher, is_active=True).exists()
            if not subscription_exists:
                raise serializers.ValidationError("You must be subscribed to the teacher to join their group.")
            
            # Create the request object
            student_group_request = StudentGroupRequest.objects.create(
                student=student, 
                group=group
            )

            serializer = StudentGroupRequestSerializer(student_group_request)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
            
        except Group.DoesNotExist:
            return Response({"error": "Group does not exist."}, status=status.HTTP_404_NOT_FOUND)

    
    def update(self, request, *args, **kwargs):
        if request.user.role != 'teacher':
            return Response({"detail": "Only teachers can manage group join requests."}, status=status.HTTP_403_FORBIDDEN)

        request_instance = self.get_object()

        if 'accept' in request.data:
            request_instance.is_accepted = True
            request_instance.is_rejected = False

            try:
                group = request_instance.group
                student = request_instance.student
                try:
                    teacher = Teacher.objects.get(user=request.user)
                except Teacher.DoesNotExist:
                    return Response({"detail": "User does not have an associated Teacher instance."}, status=status.HTTP_400_BAD_REQUEST)

                if group.admin != teacher:
                    return Response({"detail": "You are not the admin of this group."}, status=status.HTTP_403_FORBIDDEN)
                
                StudentGroupRequest.delete(request_instance)
                group.students.add(student)
                group.save()

            except Group.DoesNotExist:
                return Response({"detail": "Group does not exist."}, status=status.HTTP_400_BAD_REQUEST)
            except Student.DoesNotExist:
                return Response({"detail": "Student does not exist."}, status=status.HTTP_400_BAD_REQUEST)
            except Exception as e:
                return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        elif 'reject' in request.data:
            request_instance.is_rejected = True
            request_instance.is_accepted = False
            request_instance.delete()

        
        serlizer = self.get_serializer()
        return Response(serlizer.data, status=status.HTTP_200_OK)
    

class TeacherGroupRequestViewSet(viewsets.ModelViewSet):
    serializer_class = StudentGroupRequestSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        request_group_id = self.request.query_params.get('group_id')

        if request_group_id:
            return StudentGroupRequest.objects.filter(group__id=request_group_id)

        return StudentGroupRequest.objects.none()

    def list(self, request):
        queryset = self.get_queryset()
        serializer = StudentGroupRequestSerializer(queryset, many=True)
        return Response(serializer.data)
