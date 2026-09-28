from django.db.models.signals import post_save
from django.dispatch import receiver

from notifications.models import Notification
from .models import Schedule
from notifications.utils import send_notification

from django.db.models.signals import post_save
from django.dispatch import receiver
from notifications.utils import send_notification
from .models import Schedule

@receiver(post_save, sender=Schedule)
def notify_students_on_schedule_creation(sender, instance, created, **kwargs):
    if created:
        group = instance.group
        message = f"تم تغيير و اضافة توقيت جديد في المجموعة: {group.name}"

        for student in group.students.all():
            send_notification(
                recipient=student.user,
                sender=None,  # or instance.created_by if you track it
                notification_type="scheduled",
                message=message,
                group_id=str(group.uuid)
            )
