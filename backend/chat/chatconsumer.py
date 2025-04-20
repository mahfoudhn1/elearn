from channels.generic.websocket import AsyncWebsocketConsumer
import json
from channels.db import database_sync_to_async
from .models import ChatMessage
from .serializer import ChatMessageSerializer
from groups.models import Group
from rest_framework.exceptions import PermissionDenied

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.group_id = self.scope['url_route']['kwargs']['group_id']
        self.room_group_name = f"chat_{self.group_id}"
        self.user = self.scope['user']

        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        data = json.loads(text_data)
        message_text = data.get('message')

        if data.get('type') == 'delete':
            message_id = data.get('message_id')
            await self.delete_message(message_id, self.user)
        else:
            message_data = await self.save_message(self.group_id, self.user, message_text)

        # Broadcast to group
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'chat_message',
                    'message_data': message_data
                }
            )

    async def chat_message(self, event):
        # Send the serialized message
        await self.send(text_data=json.dumps(event['message_data']))

    @database_sync_to_async
    def save_message(self, group_id, user, message):
        group = Group.objects.get(id=group_id)

        # Permissions check (similar to your ViewSet)
        if user != group.admin.user and user not in [student.user for student in group.students.all()]:
            raise PermissionDenied("You're not a member of this group.")

        chat_message = ChatMessage.objects.create(
            group=group,
            sender=user,
            message=message
        )

        serializer = ChatMessageSerializer(chat_message)
        return serializer.data
    
    @database_sync_to_async
    def delete_message(self, message_id, user):
        try:
            message = ChatMessage.objects.get(id=message_id)
            # Check if user is allowed to delete (sender or admin)
            if user == message.sender or user == message.group.admin.user:
                message.delete()
                return {'type': 'message_deleted', 'message_id': message_id}
            raise PermissionDenied("You can't delete this message")
        except ChatMessage.DoesNotExist:
            return None
