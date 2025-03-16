from django.db.models.signals import post_save
from django.dispatch import receiver
from notifications.models import Notification
from .models import Meeting
from notifications.utils import send_notification

@receiver(post_save, sender=Meeting)
def notify_students_on_meeting_start(sender, instance, created, **kwargs):
    # Check if the meeting is being started (start_time is being set)
    if not created and instance.start_time and instance._state.adding is False:
        # Get the group and students
        group = instance.group
        message = f"A meeting has started for your group: {group.name}. Join now!"

        for student in group.students.all():
            # Create a notification for each student
            Notification.objects.create(
                recipient=student.user,  # Use the user associated with the student
                notification_type='meeting_start',
                message=message,
                room_id=instance.room_name  # Store the room name for reference
            )

            # Send the notification in real-time
            send_notification(student.user.id, {
                'type': 'meeting_start',
                'message': message,
                'room_id': instance.room_name
            })