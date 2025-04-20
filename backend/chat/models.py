from django.db import models
from groups.models import Group
from users.models import User, Teacher, Student


def chat_upload_path(instance, filename):
    return f'group_chats/group_{instance.group.id}/{filename}'

class ChatMessage(models.Model):
    group = models.ForeignKey(Group, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(User, on_delete=models.CASCADE)
    message = models.TextField(blank=True, null=True)
    file = models.FileField(upload_to=chat_upload_path, blank=True, null=True)
    is_pinned = models.BooleanField(default=False)
    created = models.DateTimeField(auto_now_add=True)

    

    class Meta:
        ordering = ['created']

    def __str__(self):
        return f'{self.sender.username} - {self.message[:30] if self.message else "File Message"}'
