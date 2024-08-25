from datetime import datetime
from django.shortcuts import redirect
import requests
from django.http import HttpResponse
from rest_framework.decorators import action
from rest_framework import viewsets, status
from .zoom_service import ZoomOAuthService
from .serializers import ZoomMeetingSerializer
from rest_framework.permissions import IsAuthenticated
from .models import ZoomMeeting
from rest_framework.response import Response


class OAuthViewSet(viewsets.ViewSet):
    
    @action(detail=False, methods=['get'])
    def zoom_authenticate(self, request):
        oauth_service = ZoomOAuthService()
        auth_url = oauth_service.get_authorization_url()
        return redirect(auth_url)

    @action(detail=False, methods=['get'])
    def oauth_callback(self, request):
        code = request.GET.get('code')
        if not code:
            return HttpResponse('No authorization code provided.', status=400)
        
        oauth_service = ZoomOAuthService()
        try:
            token_data = oauth_service.exchange_code_for_token(code)
            request.session['zoom_access_token'] = token_data['access_token']
            
            print('Authentication successful. You can now close this window.')
            print(request.session.get('zoom_access_token'))

            return HttpResponse('Authentication successful. You can now close this window.')
        except requests.RequestException as e:
            return HttpResponse(f'Error during authentication: {str(e)}', status=500)
        


class ZoomMeetingViewSet(viewsets.ModelViewSet):
    serializer_class = ZoomMeetingSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = ZoomMeeting.objects.all()

        if hasattr(user, 'teacher'):
            queryset = queryset.filter(teacher__user=user)
        elif hasattr(user, 'student'):
            queryset = queryset.filter(students=user)
        
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
                start_time = datetime.strptime(start_time, "%Y-%m-%d %H:%M")
            except ValueError as e:
                return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)
            
        access_token = request.session.get('zoom_access_token')
        if not access_token:
            access_token = request.headers.get('X-Zoom-Access-Token')
        
        if not access_token:
            return Response({'detail': 'OAuth token missing'}, status=status.HTTP_400_BAD_REQUEST)
        
        oauth_service = ZoomOAuthService()
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