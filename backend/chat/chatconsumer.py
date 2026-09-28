import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_name = self.scope["url_route"]["kwargs"].get("room_name", "default")
        self.room_group_name = f"chat_{self.room_name}"
        self.group_id = self.scope["url_route"]["kwargs"].get("group_id")

        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def receive(self, text_data=None, bytes_data=None):
        try:
            data = json.loads(text_data or "{}")
        except json.JSONDecodeError:
            await self.send(text_data=json.dumps({"error": "Invalid JSON"}))
            return

        sender = self.scope["user"]

        # Handle delete
        if data.get("type") == "delete":
            msg_id = data.get("messageId") or data.get("message_id")
            await self.delete_message(msg_id)
            await self.channel_layer.group_send(
                self.room_group_name,
                {"type": "chat_delete", "id": msg_id}
            )
            return  # stop further processing

        # Handle new message
        message = data.get("message")
        if not message:
            await self.send(text_data=json.dumps({"error": "Message is required"}))
            return

        chat_message = await self.save_message(self.group_id, sender, message)
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "chat_message",
                "id": str(chat_message.uuid),
                "message": chat_message.message,
                "sender": {
                    "id": str(sender.uuid),
                    "username": sender.username,
                    "first_name": sender.first_name,
                    "last_name": sender.last_name,
                },
                "is_pinned": chat_message.is_pinned,
                "created": chat_message.created.isoformat(),
            }
        )

    async def chat_message(self, event):
        await self.send(text_data=json.dumps(event))

    async def chat_delete(self, event):
        await self.send(text_data=json.dumps({
            "type": "message_deleted",
            "message_id": event["id"]
        }))

    @database_sync_to_async
    def save_message(self, group_id, sender, message):
        from .models import ChatMessage
        from groups.models import Group

        group = Group.objects.get(uuid=group_id)
        return ChatMessage.objects.create(group=group, sender=sender, message=message)

    @database_sync_to_async
    def delete_message(self, msg_id):
        from .models import ChatMessage
        try:
            msg = ChatMessage.objects.get(uuid=msg_id)
            msg.delete()
            return True
        except ChatMessage.DoesNotExist:
            return False
