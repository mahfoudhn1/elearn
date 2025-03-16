import logging
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

logger = logging.getLogger(__name__)

def send_notification(user_id, message):
    logger.info(f"Sending notification to notifications_{user_id}: {message}")  # Log message
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        f"notifications_{user_id}",
        {
            "type": "send_notification",
            "message": message,
        }
    )
