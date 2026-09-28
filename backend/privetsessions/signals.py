import uuid
from django.db.models.signals import post_save
from django.dispatch import receiver

from jitsi.models import Meeting
from .models import CheckSessionPaiment, PrivateSessionRequest
from notifications.models import Notification
from notifications.utils import send_notification 
from django.utils import timezone

@receiver(post_save, sender=PrivateSessionRequest)
def notify_on_private_session_request(sender, instance, created, **kwargs):
    if created:
        message = f"📩 لديك طلب حصة خاصة جديد من {instance.student.user.get_full_name()}."
        send_notification(
            recipient=instance.teacher.user,
            sender=instance.student.user,
            notification_type="private_session",
            message=message
        )

    elif instance.status == "accepted":
        message = f"✅ تم قبول حصة خاصة من قبل {instance.teacher.user.username}. الموعد المقترح: {instance.proposed_date}."
        send_notification(
            recipient=instance.student.user,
            sender=instance.teacher.user,
            notification_type="private_session",
            message=message
        )

    elif instance.status == "rejected":
        message = f"❌ تم رفض طلب الحصة الخاصة الخاصة من قبل {instance.teacher.user.username}."
        send_notification(
            recipient=instance.student.user,
            sender=instance.teacher.user,
            notification_type="private_session",
            message=message
        )

    elif instance.status == "deleted":
        message = f"🗑️ قام {instance.student.user.username} بحذف طلب الحصة الخاصة الخاصة."
        send_notification(
            recipient=instance.teacher.user,
            sender=instance.student.user,
            notification_type="private_session",
            message=message
        )
        
@receiver(post_save, sender=CheckSessionPaiment)
def update_payment_status(sender, instance, **kwargs):
    if instance.is_verified:
        session_request = instance.PrivateSession
        if not session_request.is_paied:
            session_request.is_paied = True
            session_request.save()  # This triggers post_save on PrivateSessionRequest
            if hasattr(session_request, 'session'):
                private_session = session_request.session
                if not private_session.paid:
                    private_session.paid = True
                    private_session.save()

@receiver(post_save, sender=PrivateSessionRequest)
def create_jitsi_room(sender, instance, created, **kwargs):

    if instance.is_paied:
        if not Meeting.objects.filter(privetsession=instance).exists():
            room_id = str(uuid.uuid4())[:8]
            
            meeting=Meeting.objects.create(
                teacher=instance.teacher,
                room_name=f"PrivateSession-{room_id}",
                privetsession=instance, 
                is_active=True,
                start_time=instance.proposed_date if instance.proposed_date else timezone.now(),
            )
            meeting.students.add(instance.student)
