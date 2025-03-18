from rest_framework import generics, permissions, status, viewsets
from rest_framework.response import Response
from .models import PrivateSession, PrivateSessionRequest
from .serializers import PrivateSessionRequestSerializer, PrivateSessionSerializer
from users.models import Student, Teacher

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
            
            # Create a PrivateSession
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
