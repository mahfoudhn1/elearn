from rest_framework.test import APITestCase

from groups.models import Group
from jitsi.models import Meeting
from users.models import Teacher, User


class MeetingActivationTests(APITestCase):
	def setUp(self):
		self.user = User.objects.create_user(
			username="meeting-teacher",
			email="meeting-teacher@example.com",
			password="pass12345",
			role="teacher",
		)
		self.teacher = Teacher.objects.create(user=self.user)
		self.group = Group.objects.create(name="Teacher group", admin=self.teacher)
		self.client.force_authenticate(self.user)

	def test_create_meeting_waits_for_teacher_to_start_it(self):
		response = self.client.post(
			"/api/live/create_meeting/",
			{"group_id": str(self.group.uuid)},
			format="json",
		)

		self.assertEqual(response.status_code, 201)
		meeting = Meeting.objects.get(uuid=response.data["meeting"]["id"])
		self.assertFalse(meeting.is_active)
