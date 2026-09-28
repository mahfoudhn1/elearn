# notifications/services.py
from .utils import send_notification

class NotificationService:
    @staticmethod
    def create_and_send(user, notification_type, message, **extra_data):
        """
        Create a Notification in DB + send real-time via WebSocket
        """
        return send_notification(
            recipient=user,
            notification_type=notification_type,
            message=message,
            **extra_data
        )
