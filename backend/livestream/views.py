from datetime import datetime, timedelta
from django.utils import timezone
from django.shortcuts import redirect
import requests
from django.http import HttpResponse, JsonResponse
from rest_framework.decorators import action
from rest_framework import viewsets, status

from users.models import Student, Teacher
from subscription.models import Subscription
from .zoom_service import ZoomOAuthService
from .serializers import ZoomMeetingSerializer
from rest_framework.permissions import IsAuthenticated
from .models import ZoomMeeting
import jwt
import time
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response


class OAuthViewSet(viewsets.ViewSet):
    
    @action(detail=False, methods=['get'])
    def zoom_authenticate(self, request):
        oauth_service = ZoomOAuthService()
        auth_url = oauth_service.get_authorization_url()
        return JsonResponse({'auth_url': auth_url})

    @action(detail=False, methods=['get'])
    def oauth_callback(self, request):
        code = request.GET.get('code')
        if not code:
            return HttpResponse('No authorization code provided.', status=400)
        
        oauth_service = ZoomOAuthService()
        try:
            token_data = oauth_service.exchange_code_for_token(code)
            
            # request.session['zoom_access_token'] = token_data['access_token']
            request.user.zoom_access_token = token_data['access_token']
            request.user.zoom_refresh_token = token_data['refresh_token']
            expires_in = token_data['expires_in']
            request.user.zoom_token_expires_at = timezone.now() + timedelta(seconds=expires_in)
            request.user.save()
            print('Authentication successful. You can now close this window.')
            # print(request.session.get('zoom_access_token'))

            return HttpResponse('Authentication successful. You can now close this window.')
        except requests.RequestException as e:
            return HttpResponse(f'Error during authentication: {str(e)}', status=500)
    
    @action(detail=False, methods=['get'])
    def get_zoom_token(request):
        if not request.user.is_authenticated:
            return Response({'error': 'Unauthorized'}, status=401)

        zoom_access_token = request.request.user.zoom_access_token
        
        if zoom_access_token:
            return Response({'zoom_access_token': zoom_access_token})
        else:
            return Response({'error': 'Zoom access token not found'}, status=404)


class ZoomMeetingViewSet(viewsets.ModelViewSet):
    serializer_class = ZoomMeetingSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = ZoomMeeting.objects.all()

        if hasattr(user, 'teacher'):
            queryset = queryset.filter(teacher__user=user)
            date = self.request.query_params.get('date')
            if date:
                queryset = queryset.filter(start_time__date=date)
        elif hasattr(user, 'student'):
            queryset = queryset.filter(students=user)
            date = self.request.query_params.get('date')
            if date:
                queryset = queryset.filter(start_time__date=date)
        date = self.request.query_params.get('date')
        if date:
            queryset = queryset.filter(start_time__date=date)
        
        return queryset
    

    def create(self, request, *args, **kwargs):
        if not hasattr(request.user, 'teacher'):
            return Response({'detail': 'You do not have permission to create a meeting.'}, status=status.HTTP_403_FORBIDDEN)
        
        data = request.data
        topic = data.get('topic')
        agenda = data.get('agenda')
        start_time = data.get('start_time')
        duration = data.get('duration')

        if isinstance(start_time, str):
            try:
                start_time = datetime.strptime(start_time, "%Y-%m-%dT%H:%M:%S")
            except ValueError as e:
                return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        
        oauth_service = ZoomOAuthService()
        access_token = oauth_service.get_access_token(request.user)
        print(access_token)
        if not access_token:
            return Response({'detail': 'OAuth token missing or invalid.'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            meeting_data = oauth_service.create_meeting(access_token, topic, start_time, duration, agenda)
            meeting = ZoomMeeting.objects.create(
                teacher=request.user.teacher,
                topic=topic,
                start_time=start_time,
                duration=duration,
                agenda=agenda,
                zoom_meeting_id=meeting_data['id'],
                join_url=meeting_data['join_url'],
            )
            return Response(ZoomMeetingSerializer(meeting).data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        


class ZoomSignatureView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        meeting_id = request.data.get('meeting_number') 
        user = request.user
        teacher_id = request.data.get('teacher_id')
     
        
        if Teacher.objects.filter(user=user).exists():
            role = "1"  # Host
        else:
            role = "0"  # Attendee

        # Validate meeting_id and role
        if not meeting_id or role not in ["0", "1"]:
            return Response({'error': 'Invalid meeting ID or role.'}, status=status.HTTP_400_BAD_REQUEST)

        # Secure API Key and Secret
        api_key = settings.ZOOM_SDK_ID  # Store in your environment
        api_secret = settings.ZOOM_SDK_SECRET  # Store in your environment

        # If the user is an attendee (role = 0), verify subscription to the teacher
        if role == "0":
            teacher = Teacher.objects.get(id=teacher_id)
            teacher_id = request.data.get('teacher_id')
            student = Student.objects.get(user = user)
            if not teacher_id or not self.is_student_subscribed(student, teacher_id):
                return Response({'error': 'User is not subscribed to the teacher.'}, status=status.HTTP_403_FORBIDDEN)

        print(api_key)
        print(api_secret)

        oHeader = {
            "alg": 'HS256',
            "typ": 'JWT'
        }

        oPayload = {
            "sdkKey": api_key,
            "mn": meeting_id,
            "role": role,
            "iat": int(time.time()),  # Issued at time
            "exp": int(time.time()) + 6000,  # Signature expires in 6000 seconds
            "tokenExp": int(time.time()) + 6000  # Token expires in 6000 seconds
        }

        signature = jwt.encode(oPayload, api_secret, algorithm="HS256", headers=oHeader)

        return Response({'signature': signature}, status=status.HTTP_200_OK)


    def is_student_subscribed(self, student, teacher_id):
        """
        Check if the student is subscribed to the given teacher.
        """
        teacher = Teacher.objects.get(id=teacher_id)
        print(teacher)
        subscirption = Subscription.objects.filter(student=student)
        print(subscirption)
        return Subscription.objects.filter(student=student, teacher=teacher_id, is_active=True).exists()

