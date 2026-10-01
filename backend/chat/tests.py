from rest_framework.test import APITestCase

from groups.models import Group
from users.models import Teacher, User

from .models import ChatMessage


class GroupAnnouncementTests(APITestCase):
	def setUp(self):
		self.user = User.objects.create_user(
			username="announcement-teacher",
			email="announcement-teacher@example.com",
			password="pass12345",
			role="teacher",
		)
		teacher = Teacher.objects.create(user=self.user)
		self.group = Group.objects.create(name="Announcement group", admin=teacher)
		ChatMessage.objects.create(
			group=self.group,
			sender=self.user,
			message="Class starts at 10.",
			is_pinned=True,
		)
		self.client.force_authenticate(self.user)

	def test_group_chat_lists_pinned_messages_as_announcements(self):
		response = self.client.get(
			"/api/chat/", {"group_id": str(self.group.uuid)}
		)

		self.assertEqual(response.status_code, 200)
		pinned = response.data["results"]["pinned_messages"]
		self.assertEqual(len(pinned), 1)
		self.assertEqual(pinned[0]["message"], "Class starts at 10.")
