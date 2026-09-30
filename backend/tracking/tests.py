from django.urls import reverse
from rest_framework.test import APIClient, APITestCase

from users.models import User

from .models import ActivityEvent
from .services import record_activity


class TrackingAPITests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="tracker-user",
            email="tracker@example.com",
            password="pass12345",
            role="student",
        )
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    def test_record_activity_creates_event(self):
        event = record_activity(self.user, "VIDEO_WATCH", duration_seconds=120)
        self.assertEqual(event.user, self.user)
        self.assertEqual(event.event_type, "VIDEO_WATCH")
        self.assertTrue(ActivityEvent.objects.filter(pk=event.pk).exists())

    def test_overview_endpoint_returns_summary_and_streak(self):
        record_activity(self.user, "VIDEO_WATCH", duration_seconds=120)
        response = self.client.get(reverse("tracking-overview"))
        self.assertEqual(response.status_code, 200)
        self.assertIn("total_events", response.data)
        self.assertIn("streak_days", response.data)
        self.assertGreaterEqual(response.data["streak_days"], 1)

    def test_student_courses_progress(self):
        response = self.client.get(reverse("tracking-student-courses"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, [])
