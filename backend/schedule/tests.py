from django.urls import reverse
from rest_framework.test import APITestCase

from users.models import User


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
