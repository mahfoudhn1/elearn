from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import NotFound
from rest_framework.decorators import action
from rest_framework.response import Response
from subscription.models import Subscription
from groups.models import StudentGroupRequest, Group
from groups.serializers import StudentGroupRequestSerializer
from users.models import Student
from rest_framework import serializers

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