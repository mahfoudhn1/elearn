from channels.generic.websocket import AsyncWebsocketConsumer
import json
import logging

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
        else:
            await self.close()

    async def disconnect(self, close_code):
        if self.user and self.user.is_authenticated:
            await self.channel_layer.group_discard(
                f"notifications_{self.user.id}",
                self.channel_name
            )
            logger.info(f"User {self.user.id} disconnected from WebSocket.")

    async def send_notification(self, event):
        await self.send(text_data=json.dumps(event))  



