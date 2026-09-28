from channels.generic.websocket import AsyncWebsocketConsumer
from asgiref.sync import sync_to_async
import json
import logging
import asyncio

logger = logging.getLogger(__name__)

class NotificationConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = self.scope.get("user", None)

        if self.user and self.user.is_authenticated:
            await self.accept()
            await self.channel_layer.group_add(
                f"notifications_{self.user.id}",
                self.channel_name
            )
            logger.info(f"User {self.user.id} connected to WebSocket.")
            # ✅ Fetch and send missed notifications safely
            # await self.send_missed_notifications()

            self.ping_task = asyncio.create_task(self.send_ping_loop())
        else:
            logger.warning("User not authenticated.")
            await self.close()

    async def disconnect(self, close_code):
        if self.user and self.user.is_authenticated:
            await self.channel_layer.group_discard(
                f"notifications_{self.user.id}",
                self.channel_name
            )
            logger.info(f"User {self.user.id} disconnected.")
        if hasattr(self, 'ping_task'):
            self.ping_task.cancel()

    async def send_missed_notifications(self):
        """ Fetch unseen notifications safely (ORM in sync thread). """
        from .models import Notification  # lazy import

        unseen = await sync_to_async(list)(Notification.objects.filter(
            recipient=self.user,
            is_seen=False
        ).order_by("-created_at")[:20])

        for notif in unseen:
            await self.send(text_data=json.dumps({
                "id": str(notif.uuid),
                "type": notif.notification_type,
                "message": notif.message,
                "created_at": notif.created_at.isoformat(),
                "read": notif.read,
                "is_seen": notif.is_seen,
            }))

    async def send_notification(self, event):
        """ Called when group_send pushes a notification. """
        await self.send(text_data=json.dumps(event))

    async def send_ping_loop(self):
        while True:
            await self.send(text_data=json.dumps({"type": "ping"}))
            await asyncio.sleep(30)
