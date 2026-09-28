# notifications/utils.py
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from .models import Notification

def send_notification(recipient, message, notification_type="general", sender=None, **kwargs):
    """
    Centralized notification creator + dispatcher.
    If user online -> send via WebSocket.
    Always saved in DB for offline delivery.
    """
    notification = Notification.objects.create(
        recipient=recipient,
        sender=sender,
        notification_type=notification_type,
        message=message,
        room_id=kwargs.get("room_id"),
        group_id=kwargs.get("group_id"),
        subscription_id=kwargs.get("subscription_id"),
    )

    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        f"notifications_{recipient.id}",
        {
            "type": "send_notification",
            "message": {
                "id": str(notification.uuid),
                "type": notification.notification_type,
                "message": notification.message,
                "created_at": str(notification.created_at),
                "read": notification.read,
                "is_seen": notification.is_seen,
            }
        }
    )

    return notification
