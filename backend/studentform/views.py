from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework.throttling import AnonRateThrottle
from django.conf import settings
import requests
import time
import hashlib
import json
import uuid
from users.utils import verify_captcha
from .models import StudentForm
from .serializers import StudentFormSerializer
from .telegram_bot import send_telegram_notification

from core.views import UUIDLookupMixin
def send_facebook_lead_event(form_data, event_id=None):
    url = f"https://graph.facebook.com/v19.0/{settings.FACEBOOK_PIXEL_ID}/events"
    event_id_to_send = event_id or str(uuid.uuid4())
    
    event_data = {
        "data": [
            {
                "event_name": "Lead",
                "event_time": int(time.time()),
                "event_id": event_id_to_send,
            
                "user_data": {
                    "ph": [hashlib.sha256(form_data.get('phone_number').encode()).hexdigest()],
                    "fn": [hashlib.sha256(form_data.get('name').encode()).hexdigest()],
                    "ln": [hashlib.sha256(form_data.get('family_name').encode()).hexdigest()],
                },
                "custom_data": {
                    "education_level": form_data.get('education_level'),
                    "subjects": form_data.get('subjects'),
                },
                "action_source": "website",
            }
        ],
        "access_token": settings.FACEBOOK_ACCESS_TOKEN,
        "test_event_code": "TEST66026"
    }

    try:
        response = requests.post(url, json=event_data)
        response.raise_for_status()
        print(f"Facebook API response: {response.json()}")
    except requests.exceptions.RequestException as e:
        print(f"Error sending event to Facebook: {e}")


class StudentFormViewSet(UUIDLookupMixin, viewsets.ModelViewSet):
    queryset = StudentForm.objects.all()
    serializer_class = StudentFormSerializer
    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):
        data = request.data.copy()

        # Captcha check
        captcha_token = data.get("captcha")
        if not captcha_token:
            return Response({"error": "الكابتشا مفقودة"}, status=status.HTTP_400_BAD_REQUEST)

        url = "https://challenges.cloudflare.com/turnstile/v0/siteverify"
        verify_response = requests.post(url, data={
            "secret": settings.CLOUDFLARE_TURNSTILE_SECRET_KEY,
            "response": captcha_token
        }).json()

        if not verify_response.get("success", False):
            return Response({"error": "فشل التحقق من الكابتشا", "details": verify_response}, status=400)

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)

        # ✅ Send Telegram notification
        form = serializer.instance
        message = (
            f"🆕 <b>New Student Account Created!</b>\n"
            f"👤 Name: {getattr(form, 'name', 'N/A')}\n"
            f"👤 family_name: {getattr(form, 'family_name', 'N/A')}\n"
            f"📱 education_level: {getattr(form, 'education_level', 'N/A')}"
        )
        send_telegram_notification(message)


        send_facebook_lead_event(serializer.data, event_id=request.data.get("event_id"))

        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
