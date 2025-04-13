# your_app/views.py
from rest_framework import viewsets, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from users.models import User

class VerifyEmailView(viewsets.ViewSet):
    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):
        token = request.data.get('token')
        if not token:
            return Response({"detail": "Token is required."}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Validate the UUID token
            user = User.objects.get(verification_token=token, email_verified=False)
            user.email_verified = True
            user.save()
            return Response({"message": "Email verified successfully."}, status=status.HTTP_200_OK)
        
        except User.DoesNotExist:
            return Response({"detail": "Invalid or expired token."}, status=status.HTTP_400_BAD_REQUEST)