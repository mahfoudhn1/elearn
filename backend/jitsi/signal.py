from django.db.models.signals import post_save
from django.dispatch import receiver
from notifications.utils import send_notification
from .models import Meeting


@receiver(post_save, sender=Meeting)
def notify_students_on_meeting_status(sender, instance, created, **kwargs):
    group = instance.group
    privet_session = getattr(instance, "privetsession", None)

    # Who to notify
    if group:
        students = group.students.all()
    elif privet_session:
        students = [privet_session.student]
    else:
        return

    # 1️⃣ Notify when meeting starts
    if not created and instance.start_time and instance.is_active:
        message = (
            f"لقد بدأ البث المباشر في المجموعة {group.name}. ادخل الان!"
            if group else "لقد بدأ بث الحصة الخاصة، انضم الآن!"
        )

        for student in students:
            send_notification(
                recipient=student.user,
                sender=getattr(instance, "host", None),
                notification_type="meeting_start",
                message=message,
                room_id=str(instance.uuid),
            )

    # 2️⃣ Notify when meeting ends
    if not instance.is_active and instance.end_time:
        message = (
            f"انتهى البث المباشر في المجموعة {group.name}."
            if group else "انتهى بث الحصة الخاصة."
        )

        for student in students:
            send_notification(
                recipient=student.user,
                sender=getattr(instance, "host", None),
                notification_type="meeting_end",
                message=message,
                room_id=str(instance.uuid),
            )
