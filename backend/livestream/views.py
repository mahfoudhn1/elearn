from datetime import datetime, timedelta
from django.utils import timezone
from django.shortcuts import get_object_or_404, redirect
import requests
from django.http import HttpResponse, JsonResponse
from rest_framework.decorators import action
from rest_framework import viewsets, status

from groups.models import Schedule
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
    def get_zoom_token(self, request):
        if not request.user.is_authenticated:
            return Response({'error': 'Unauthorized'}, status=401)

        zoom_access_token = request.user.zoom_access_token
        print(zoom_access_token)
        if zoom_access_token:
            return Response({'zoom_access_token': zoom_access_token})
        else:
            return Response({'error': 'Zoom access token not found'}, status=404)
    
    @action(detail=False, methods=['get'])
    def get_zak_token(self, request):
        if not request.user.is_authenticated:
            return Response({'error': 'Unauthorized'}, status=401)

        oauth_service = ZoomOAuthService()
        access_token = oauth_service.get_access_token(request.user)
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }
        response = requests.get(f'https://api.zoom.us/v2/users/me/token?type=zak', headers=headers)
        if response.status_code == 200:
            zak_token = response.json().get('token')
            return Response({'zak_token': zak_token})
        else:
            return None

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

        # Determine role (host or attendee)
        role = "1" if Teacher.objects.filter(user=user).exists() else "0"

        # Validate meeting_id and role
        if not meeting_id or role not in ["0", "1"]:
            return Response({'error': 'Invalid meeting ID or role.'}, status=status.HTTP_400_BAD_REQUEST)

        # Secure API Key and Secret
        api_key = settings.ZOOM_SDK_ID  # Store in your environment
        api_secret = settings.ZOOM_SDK_SECRET  # Store in your environment

        if role == "0":  # If the user is an attendee
            teacher = get_object_or_404(Teacher, id=teacher_id)
            student = get_object_or_404(Student, user=user)
            schedule = get_object_or_404(Schedule, zoom_meeting_id=meeting_id)

            # Check if the student is subscribed to the teacher
            if not self.is_student_subscribed(student, teacher.id):
                return Response({'error': 'User is not subscribed to the teacher.'}, status=status.HTTP_403_FORBIDDEN)

            if student not in schedule.group.students.all():
                return Response({"error": "Student is not in the group"}, status=status.HTTP_403_FORBIDDEN)

        # Generate JWT signature
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
        return Subscription.objects.filter(student=student, teacher_id=teacher_id, is_active=True).exists()


# class ZoomVideoSDKAuthView(APIView):
#     def post(self, request):
#         # Validation functions
#         def is_required(value):
#             return value is not None and value != ""

#         def in_number_array(arr):
#             return lambda value: isinstance(value, int) and value in arr

#         def is_length_less_than(length):
#             return lambda value: value is None or len(str(value)) < length

#         def is_between(min_val, max_val):
#             return lambda value: value is None or (isinstance(value, int) and min_val <= value <= max_val)

#         def matches_string_array(arr):
#             return lambda value: value is None or (isinstance(value, list) and all(item in arr for item in value))

#         # Validator
#         validator = {
#             'role': [is_required, in_number_array([0, 1])],
#             'sessionName': [is_required, is_length_less_than(200)],
#             'expirationSeconds': is_between(1800, 172800),
#             'userIdentity': is_length_less_than(35),
#             'sessionKey': is_length_less_than(36),
#             'geoRegions': matches_string_array(['AU', 'BR', 'CA', 'CN', 'DE', 'HK', 'IN', 'JP', 'MX', 'NL', 'SG', 'US']),
#             'cloudRecordingOption': in_number_array([0, 1]),
#             'cloudRecordingElection': in_number_array([0, 1]),
#             'audioCompatibleMode': in_number_array([0, 1])
#         }

#         # Coerce request data
#         data = request.data.copy()
#         for key in ['role', 'expirationSeconds', 'cloudRecordingOption', 'cloudRecordingElection', 'audioCompatibleMode']:
#             if key in data and isinstance(data[key], str):
#                 try:
#                     data[key] = int(data[key])
#                 except ValueError:
#                     pass

#         # Validate request
#         errors = []
#         for field, validations in validator.items():
#             if not isinstance(validations, list):
#                 validations = [validations]
#             for validation in validations:
#                 if field in data and not validation(data[field]):
#                     errors.append(f"Invalid {field}")
#                     break

#         if errors:
#             return Response({"errors": errors}, status=status.HTTP_400_BAD_REQUEST)

#         # Generate JWT
#         iat = int(datetime.utcnow().timestamp())
#         exp = iat + (data.get('expirationSeconds') or 7200)
        
#         payload = {
#             "app_key": settings.ZOOM_CLIENT_ID,
#             "role_type": data['role'],
#             "tpc": data['sessionName'],
#             "version": 1,
#             "iat": iat,
#             "exp": exp,
#         }

#         optional_fields = ['userIdentity', 'sessionKey', 'geoRegions', 'cloudRecordingOption', 'cloudRecordingElection', 'audioCompatibleMode']
#         for field in optional_fields:
#             if field in data:
#                 payload[field] = data[field]

#         if 'geoRegions' in payload:
#             payload['geo_regions'] = ','.join(payload['geoRegions'])
#             del payload['geoRegions']

#         sdk_jwt = jwt.encode(payload, settings.ZOOM_CLIENT_SECRET, algorithm="HS256")

#         return Response({"signature": sdk_jwt})

