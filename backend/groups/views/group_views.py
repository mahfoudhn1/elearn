from django.shortcuts import get_object_or_404
from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import NotFound
from rest_framework.decorators import action
from rest_framework.response import Response
from subscription.models import Subscription
from groups.serializers import GroupSerializer
from groups.models import Group
from users.models import Teacher, Student, SchoolLevel
from users.serializers import StudentSerializer


class GroupViewSet(viewsets.ModelViewSet):
    serializer_class = GroupSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        field_of_study_id = self.request.query_params.get('field_of_study', None)
        school_level_name = self.request.query_params.get('school_level', None)
        group_id = self.kwargs.get('pk', None)
        queryset = Group.objects.all()

        if group_id:
            try:
                return Group.objects.filter(id=group_id)
            except Group.DoesNotExist:
                raise NotFound("Group not found")


        if school_level_name:
            try:
                school_level = SchoolLevel.objects.get(name=school_level_name)
            except SchoolLevel.DoesNotExist:
                return Group.objects.none()
            
            queryset = queryset.filter(school_level=school_level.id)

            if school_level_name == "ثانوي":
                if not field_of_study_id:
                  
                    return Group.objects.none()
                queryset = queryset.filter(field_of_study=field_of_study_id)

        elif field_of_study_id:
            queryset = queryset.filter(field_of_study=field_of_study_id)

        if user.role == 'teacher':
            try:
                teacher = user.teacher
                queryset = queryset.filter(admin=teacher)
            except Teacher.DoesNotExist:
                return Group.objects.none()
        if user.role == 'student':
            return queryset.filter(students=user.student)
        return queryset
    
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
            group = Group.objects.get(id=group_id)
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

            if group.admin != request.user.teacher:
                return Response({'error': 'You do not have permission to remove students from this group'}, status=status.HTTP_403_FORBIDDEN)
            if not student_id:
                return Response({'error': 'Student ID is required'}, status=status.HTTP_400_BAD_REQUEST)
            
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
        group_id = request.query_params.get('group_id')

        if not group_id:
            return Response({'error': 'group_id parameter is required'}, status=status.HTTP_400_BAD_REQUEST)

        group = get_object_or_404(Group, id=group_id)

        try:
            teacher = Teacher.objects.get(user=user)
        except Teacher.DoesNotExist:
            return Response({'error': 'The authenticated user is not a teacher'}, status=status.HTTP_400_BAD_REQUEST)

        # Get students subscribed to this teacher and not in any group
        subscriptions = Subscription.objects.filter(
            teacher=teacher,
            is_active=True
        ).exclude(student__groups__isnull=False)

        subscriptions = subscriptions.filter(
            student__school_level=group.school_level,
            student__grade=group.grade
        )

        students = [subscription.student for subscription in subscriptions]

        serializer = StudentSerializer(students, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def profile_groups(self, request):
        user = request.user
        teacher_id = request.query_params.get('teacher_id')
        print(teacher_id)
        print(user)
        if user.role != 'student':
            return Response({"detail": "This action is only available for students."}, status=status.HTTP_403_FORBIDDEN)

        student = get_object_or_404(Student, user=user)

        teacher = get_object_or_404(Teacher, id=teacher_id)

        student_grade = student.grade  # Assuming the Student model has a ForeignKey to Grade

        groups = Group.objects.filter(admin=teacher, grade=student_grade)

        serializer = self.get_serializer(groups, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)