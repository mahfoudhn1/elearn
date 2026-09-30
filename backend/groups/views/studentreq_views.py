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
from users.models import Teacher

from core.views import UUIDLookupMixin
class StudentGroupRequestViewSet(UUIDLookupMixin, viewsets.ModelViewSet):
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
            group = Group.objects.get(uuid=group_id)
            teacher = group.admin 
            if not teacher:
                raise serializers.ValidationError("Group does not have an associated teacher.")

            subscription_exists = Subscription.objects.filter(student=student, teacher=teacher, is_active=True).exists()
            if not subscription_exists:
                raise serializers.ValidationError("تستطيع دخول المجمواعات بعد تفعيل اشتراكم.")

            pending = StudentGroupRequest.objects.filter(
                student=student, group=group, is_accepted=False, is_rejected=False
            ).exists()
            if pending:
                raise serializers.ValidationError("لديك طلب انضمام قيد الانتظار لهذه المجموعة.")

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
        group = request_instance.group

        try:
            teacher = Teacher.objects.get(user=request.user)
        except Teacher.DoesNotExist:
            return Response({"detail": "User does not have an associated Teacher instance."}, status=status.HTTP_400_BAD_REQUEST)

        if group.admin != teacher:
            return Response({"detail": "You are not the admin of this group."}, status=status.HTTP_403_FORBIDDEN)

        if 'accept' in request.data:
            group.students.add(request_instance.student)
            request_instance.delete()
            return Response({"detail": "Request accepted."}, status=status.HTTP_200_OK)

        if 'reject' in request.data:
            request_instance.delete()
            return Response({"detail": "Request rejected."}, status=status.HTTP_200_OK)

        return Response(
            {"detail": "Provide 'accept' or 'reject' in the request body."},
            status=status.HTTP_400_BAD_REQUEST,
        )
