from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()

class Notification(models.Model):
    NOTIFICATION_TYPES = (
        ('live_signal', 'Live Signal'),
        ('scheduled', 'Scheduled Notification'),
        ('group', 'Group Notification'),
        ('subscription_active', 'Subscription Active')
        # Add more types as needed
    )

    recipient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')

    sender = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='sent_notifications')

    notification_type = models.CharField(max_length=20, choices=NOTIFICATION_TYPES)

    message = models.TextField()

    room_id = models.CharField(max_length=100, null=True, blank=True)
    group_id = models.CharField(max_length=100, null=True, blank=True)
    subscription_id = models.CharField(max_length=100, null=True, blank=True)
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    read = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.notification_type} notification for {self.recipient.username}"