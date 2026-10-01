from datetime import timedelta

from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APITestCase

from tracking.models import ActivityEvent, DailyActivity
from users.models import User

from .models import PersonalScheduleItem, PomodoroInterval


class StudySessionUUIDActionTests(APITestCase):
	def setUp(self):
		self.user = User.objects.create_user(
			username="pomodoro-user",
			email="pomodoro@example.com",
			password="pass12345",
			role="student",
		)
		self.client.force_authenticate(self.user)

	def test_session_actions_resolve_the_returned_uuid(self):
		response = self.client.post(reverse("study-session-list"), {}, format="json")
		self.assertEqual(response.status_code, 201)
		session_uuid = response.data["id"]

		pause_response = self.client.post(
			reverse("study-session-pause", kwargs={"pk": session_uuid}),
			{},
			format="json",
		)
		self.assertEqual(pause_response.status_code, 200)
		self.assertEqual(pause_response.data["id"], session_uuid)

		finish_response = self.client.post(
			reverse("study-session-finish", kwargs={"pk": session_uuid}),
			{},
			format="json",
		)
		self.assertEqual(finish_response.status_code, 200)
		self.assertEqual(finish_response.data["status"], "COMPLETED")


class StudySessionTrackingMirrorTests(APITestCase):
	"""Closing a session must feed the tracking app and the linked item."""

	def setUp(self):
		self.user = User.objects.create_user(
			username="mirror-user",
			email="mirror@example.com",
			password="pass12345",
			role="student",
		)
		self.client.force_authenticate(self.user)
		now = timezone.now()
		self.item = PersonalScheduleItem.objects.create(
			user=self.user,
			title="Physics revision",
			subject="Physics",
			item_type=PersonalScheduleItem.ItemType.TASK,
			status=PersonalScheduleItem.Status.TODO,
			priority=PersonalScheduleItem.Priority.MEDIUM,
			start_datetime=now,
			end_datetime=now + timedelta(hours=1),
		)

	def test_finishing_session_mirrors_into_tracking(self):
		response = self.client.post(
			reverse("study-session-list"),
			{"schedule_item": str(self.item.uuid), "subject": "Physics"},
			format="json",
		)
		self.assertEqual(response.status_code, 201, response.data)
		session_uuid = response.data["id"]

		# Bank 30 real minutes; the focus interval's plan caps credit at 25.
		interval = PomodoroInterval.objects.filter(
			session__uuid=session_uuid, kind=PomodoroInterval.Kind.FOCUS
		).first()
		interval.accumulated_seconds = 1800
		interval.save(update_fields=["accumulated_seconds"])

		finish = self.client.post(
			reverse("study-session-finish", kwargs={"pk": session_uuid}),
			{},
			format="json",
		)
		self.assertEqual(finish.status_code, 200, finish.data)

		event = ActivityEvent.objects.get(user=self.user, event_type="STUDY_SESSION")
		self.assertEqual(event.duration_seconds, 1500)
		self.assertEqual(event.metadata["schedule_item"], str(self.item.uuid))
		self.assertEqual(event.metadata["schedule_item_title"], "Physics revision")

		self.item.refresh_from_db()
		self.assertEqual(self.item.actual_duration_minutes, 25)

		rollup = DailyActivity.objects.get(user=self.user)
		self.assertEqual(rollup.study_minutes, 25)

	def test_closing_is_idempotent_for_the_mirror(self):
		response = self.client.post(
			reverse("study-session-list"),
			{"schedule_item": str(self.item.uuid)},
			format="json",
		)
		session_uuid = response.data["id"]
		interval = PomodoroInterval.objects.filter(
			session__uuid=session_uuid, kind=PomodoroInterval.Kind.FOCUS
		).first()
		interval.accumulated_seconds = 600
		interval.save(update_fields=["accumulated_seconds"])

		self.client.post(
			reverse("study-session-finish", kwargs={"pk": session_uuid}),
			{},
			format="json",
		)
		# A second finish is a no-op on the closed session.
		self.client.post(
			reverse("study-session-finish", kwargs={"pk": session_uuid}),
			{},
			format="json",
		)
		self.assertEqual(
			ActivityEvent.objects.filter(
				user=self.user, event_type="STUDY_SESSION"
			).count(),
			1,
		)

	def test_focus_stop_under_one_minute_is_not_credited(self):
		response = self.client.post(reverse("study-session-list"), {}, format="json")
		session_uuid = response.data["id"]
		interval = PomodoroInterval.objects.get(session__uuid=session_uuid)
		interval.accumulated_seconds = 59
		interval.save(update_fields=["accumulated_seconds"])

		self.client.post(
			reverse("study-session-finish", kwargs={"pk": session_uuid}),
			{},
			format="json",
		)

		self.assertFalse(ActivityEvent.objects.filter(user=self.user).exists())

	def test_replayed_start_request_returns_same_session(self):
		request_id = "b84c8fc6-1524-45ba-94c6-5e1ce18b8f27"
		first = self.client.post(
			reverse("study-session-list"), {"request_id": request_id}, format="json"
		)
		second = self.client.post(
			reverse("study-session-list"), {"request_id": request_id}, format="json"
		)
		self.assertEqual(first.status_code, 201)
		self.assertEqual(second.status_code, 200)
		self.assertEqual(first.data["id"], second.data["id"])

	def test_complete_interval_replay_does_not_advance_twice(self):
		started = self.client.post(reverse("study-session-list"), {}, format="json")
		session_uuid = started.data["id"]
		request_id = "d16a44f4-4251-44d9-9037-bf129612ea97"
		url = reverse("study-session-complete-interval", kwargs={"pk": session_uuid})
		first = self.client.post(url, {"request_id": request_id}, format="json")
		second = self.client.post(url, {"request_id": request_id}, format="json")
		self.assertEqual(first.status_code, 200, first.data)
		self.assertEqual(second.status_code, 200, second.data)
		self.assertEqual(first.data["current_interval"]["id"], second.data["current_interval"]["id"])
		self.assertEqual(PomodoroInterval.objects.filter(session__uuid=session_uuid).count(), 2)

	def test_complete_interval_rejects_unelapsed_focus_claim(self):
		started = self.client.post(reverse("study-session-list"), {}, format="json")
		response = self.client.post(
			reverse("study-session-complete-interval", kwargs={"pk": started.data["id"]}),
			{"focus_seconds": 120},
			format="json",
		)
		self.assertEqual(response.status_code, 400)
		self.assertIn("focus_seconds", response.data)
