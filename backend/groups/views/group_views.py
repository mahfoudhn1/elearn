from django.shortcuts import get_object_or_404
from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import NotFound
from rest_framework.decorators import action
from rest_framework.response import Response
from languagesteaching.models import StudentLanguageProficiency,Language
from subscription.models import Subscription
from groups.serializers import GroupSerializer
from groups.models import Group
from users.models import Teacher, Student, SchoolLevel
from users.serializers import StudentSerializer 

from django.shortcuts import get_object_or_404

from core.views import UUIDLookupMixin
class GroupViewSet(UUIDLookupMixin, viewsets.ModelViewSet):
    serializer_class = GroupSerializer
    permission_classes = [IsAuthenticated]


    def get_queryset(self):
        user = self.request.user
        field_of_study_id = self.request.query_params.get('field_of_study')
        school_level_name = self.request.query_params.get('school_level')
        language_name = self.request.query_params.get('language_name')
        group_id = self.kwargs.get('pk')

        queryset = Group.objects.all()

        if group_id:
            return Group.objects.filter(uuid=group_id)

        school_level = get_object_or_404(SchoolLevel, name=school_level_name)
        queryset = queryset.filter(school_level=school_level)
       
        if school_level_name == "ثانوي":
            if not field_of_study_id:
                return Group.objects.none()
            queryset = queryset.filter(field_of_study__uuid=field_of_study_id)

        # If language filtering is requested
        if language_name:
            queryset = queryset.filter(group_type=Group.GroupType.LANGUAGE)
            queryset = queryset.filter(language__name__icontains=language_name)

        if user.role == 'teacher':
            queryset = queryset.filter(admin=user.teacher)
            print("teacher", queryset )
        elif user.role == 'student':
            queryset = queryset.filter(students=user.student)

        return queryset



    @action(detail=False, methods=['get'])
    def teacher_groups(self, request):
        user = request.user
        if user.role != 'teacher':
            return Response({"error": "Only teachers can access this."}, status=403)

        try:
            teacher = user.teacher
        except Teacher.DoesNotExist:
            return Response({"error": "Teacher profile not found."}, status=404)

        teacher_groups = Group.objects.filter(admin=teacher)
        serializer = self.get_serializer(teacher_groups, many=True)
        return Response(serializer.data)
    @action(detail=False, methods=['get'])
    def student_groups(self, request):
        user = request.user
        if user.role != 'student':
            return Response({"error": "Only students can access this."}, status=403)

        student_groups = Group.objects.filter(students=user.student)
        serializer = self.get_serializer(student_groups, many=True)
        return Response(serializer.data)
    
    
    def destroy(self,request, pk=None):
        group_id = pk  

        try:
            group = Group.objects.get(uuid=group_id)
        except Group.DoesNotExist:
            return Response({'error': 'Group not found.'}, status=status.HTTP_404_NOT_FOUND) 

        if group.admin != request.user.teacher:
            return Response({'error': 'You do not have permission to remove students from this group'}, status=status.HTTP_403_FORBIDDEN)
        
        group.delete()
        return Response({'message': 'Group deleted successfully.'}, status=status.HTTP_204_NO_CONTENT)   
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def add_student_to_group(self, request, pk=None):
        group_id = pk  # Get group ID from URL parameters
        student_id = request.data.get('student_id')

        try:
            group = Group.objects.get(uuid=group_id)
            student = Student.objects.get(uuid=student_id)


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

            if group.admin != request.user.teacher:
                return Response({'error': 'You do not have permission to remove students from this group'}, status=status.HTTP_403_FORBIDDEN)
            if not student_id:
                return Response({'error': 'Student ID is required'}, status=status.HTTP_400_BAD_REQUEST)
            
            try:
                student = group.students.get(uuid=student_id)  # Get the student from the group
                group.students.remove(student)  # Remove the student from the group
                return Response({'message': 'Student removed from group successfully'}, status=status.HTTP_204_NO_CONTENT)
            except Student.DoesNotExist:
                return Response({'error': 'Student not found in this group'}, status=status.HTTP_404_NOT_FOUND)

        except Group.DoesNotExist:
            return Response({'error': 'Group not found'}, status=status.HTTP_404_NOT_FOUND)
    
    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def Noroup_students(self, request):
        user = request.user
        group_id = request.query_params.get('group_id')

        if not group_id:
            return Response({'error': 'group_id parameter is required'}, status=status.HTTP_400_BAD_REQUEST)

        group = get_object_or_404(Group, uuid=group_id)

        try:
            teacher = Teacher.objects.get(user=user)
        except Teacher.DoesNotExist:
            return Response({'error': 'The authenticated user is not a teacher'}, status=status.HTTP_400_BAD_REQUEST)

        # Start with active subscriptions that are not in any group
        subscriptions = Subscription.objects.filter(
            teacher=teacher,
            is_active=True
        ).exclude(student__groups__isnull=False)

        if group.group_type == Group.GroupType.ACADEMIC:
            subscriptions = subscriptions.filter(
                student__grade__school_level=group.school_level,
                student__grade=group.grade
            )
            if group.field_of_study:
                subscriptions = subscriptions.filter(
                    student__field_of_study=group.field_of_study
                )

        elif group.group_type == Group.GroupType.LANGUAGE:
            matching_students = StudentLanguageProficiency.objects.filter(
                language=group.language,
                level=group.language_level
            ).values_list('student_id', flat=True)

            subscriptions = subscriptions.filter(student_id__in=matching_students)

        # Extract students from subscriptions
        students = [subscription.student for subscription in subscriptions]
        serializer = StudentSerializer(students, many=True)
        return Response(serializer.data)


    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def profile_groups(self, request):
        user = request.user
        teacher_id = request.query_params.get('teacher_id')
 
        if user.role != 'student':
            return Response({"detail": "This action is only available for students."}, status=status.HTTP_403_FORBIDDEN)

        student = get_object_or_404(Student, user=user)

        teacher = get_object_or_404(Teacher, uuid=teacher_id)

        student_grade = student.grade 

        groups = Group.objects.filter(admin=teacher, grade=student_grade)

        serializer = self.get_serializer(groups, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
