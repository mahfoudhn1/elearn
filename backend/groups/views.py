from rest_framework.response import Response

from rest_framework import viewsets
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied
from rest_framework.decorators import action
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.exceptions import NotFound

from users.serializers import StudentSerializer

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

class FieldOfStudysView(viewsets.ModelViewSet):
    queryset = FieldOfStudy.objects.all()
    serializer_class = fieldofstudySerializer
    permission_classes = [IsAuthenticated]
   
   
class GradeViewSet(viewsets.ModelViewSet):
    queryset = Grade.objects.all()
    serializer_class = gradeSerializer  # Ensure proper capitalization if `gradeSerializer` was a typo

    def get_queryset(self):
        school_level_name = self.request.query_params.get('school_level')
        
        if school_level_name:
            try:
                school_level = SchoolLevel.objects.get(name=school_level_name)

                return Grade.objects.filter(school_level=school_level.id)
            except SchoolLevel.DoesNotExist:
                return Grade.objects.all()
        

        return Grade.objects.all()

    
class ScheduleViewSet(viewsets.ModelViewSet):
    queryset = Schedule.objects.all()
    serializer_class = ScheduleSerializer
    permission_classes = [IsAuthenticated]  
    
    def create(self, request, *args, **kwargs):
        group_id = request.data.get('group_id')
        try:
            group = Group.objects.get(id=group_id)
        except Group.DoesNotExist:
            return Response({"error": "Group not found."}, status=status.HTTP_404_NOT_FOUND)

        teacher = Teacher.objects.get(user = request.user)

        if group.admin != teacher:
            raise PermissionDenied("You are not authorized to manage schedules for this group.")

        schedule = Schedule.objects.create(
            day_of_week=request.data['day_of_week'],
            start_time=request.data['start_time'],
            end_time=request.data['end_time']
        )

        group.schedule = schedule
        group.save()

        serializer = self.get_serializer(schedule)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

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
                
                print(request_instance)
                StudentGroupRequest.delete(request_instance)
                print(group)
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
