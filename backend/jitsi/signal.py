from django.db.models.signals import post_save
from django.dispatch import receiver
from notifications.models import Notification
from .models import Meeting
from notifications.utils import send_notification

@receiver(post_save, sender=Meeting)
def notify_students_on_meeting_start(sender, instance, created, **kwargs):
    if not created and instance.start_time and instance._state.adding is False:
        group = instance.group
        privet_session = instance.privetsession

        if group:
            message = f" لقد بدأ البث المباشر في المجموعة {group.name}. ادخل الان!"
            students = group.students.all()

        elif privet_session:
            message = f"لقد بدأ بث الحصة الخاصة انظم الان"
            students = [privet_session.student]  # Only one student in private session

        else:
            return  # No group or private session — skip

        for student in students:
            Notification.objects.create(
                recipient=student.user,
                notification_type='meeting_start',
                message=message,
                room_id=instance.room_name
            )

            send_notification(student.user.id, message)
