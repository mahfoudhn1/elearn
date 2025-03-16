from django.db.models.signals import post_save
from django.dispatch import receiver

from notifications.models import Notification
from .models import Schedule
from notifications.utils import send_notification

@receiver(post_save, sender=Schedule)
def notify_students_on_schedule_creation(sender, instance, created, **kwargs):
    if created:  
        group = instance.group
        message = f"تم تغيير و اضافة توقيت جديد في المجموعة: {group.name}"

        for student in group.students.all():
            Notification.objects.create(
                recipient=student.user,
                notification_type='scheduled',
                message=message,
                group_id=group.id
            )

            # Send the notification in real-time
            send_notification(student.user.id, {
                'type': 'scheduled',
                'message': message,
                'group_id': group.id
            })