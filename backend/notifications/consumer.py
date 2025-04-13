from channels.generic.websocket import AsyncWebsocketConsumer
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
            
            # Start ping loop
            self.ping_task = asyncio.create_task(self.send_ping_loop())
        else:
            await self.close()

    async def disconnect(self, close_code):
        if self.user and self.user.is_authenticated:
            await self.channel_layer.group_discard(
                f"notifications_{self.user.id}",
                self.channel_name
            )
            logger.info(f"User {self.user.id} disconnected from WebSocket.")

        # Cancel the ping loop
        if hasattr(self, 'ping_task'):
            self.ping_task.cancel()

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            if data.get("type") == "pong":
                logger.debug(f"Pong received from User {self.user.id}")
        except json.JSONDecodeError:
            logger.warning("Received invalid JSON.")

    async def send_ping_loop(self):
        try:
            while True:
                await self.send(text_data=json.dumps({"type": "ping"}))
                await asyncio.sleep(20)  # Send ping every 20 seconds
        except asyncio.CancelledError:
            pass

    async def send_notification(self, event):
        await self.send(text_data=json.dumps(event))
