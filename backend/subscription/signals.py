import logging
import threading
from django.db.models.signals import pre_save, post_save
from django.dispatch import receiver

from notifications.models import Notification
from notifications.utils import send_notification
from users.models import Payment
from datetime import timedelta
from .models import Subscription
from notifications.services import NotificationService

logger = logging.getLogger(__name__)

_thread_local = threading.local()

@receiver(pre_save, sender=Subscription)
def capture_subscription_previous_state(sender, instance, **kwargs):
    try:
        previous_instance = Subscription.objects.get(pk=instance.pk)
        _thread_local.previous_state = {
            'is_active': previous_instance.is_active,
            'end_date': previous_instance.end_date,
        }
    except Subscription.DoesNotExist:
        _thread_local.previous_state = {
            'is_active': None,
            'end_date': None,
        }

@receiver(post_save, sender=Subscription)
def update_teacher_payment_and_notify_student(sender, instance, created, raw, **kwargs):
    if created or raw:
        return

    previous_state = getattr(_thread_local, 'previous_state', {'is_active': None, 'end_date': None})
    previous_is_active = previous_state['is_active']
    previous_end_date = previous_state['end_date']

    teacher = instance.teacher
    student = instance.student

    # Activation
    if instance.is_active and (previous_is_active is False or previous_is_active is None):
        instance.end_date = instance.start_date + timedelta(days=instance.plan.duration_days)
        instance.save(update_fields=['end_date'])

        adjusted_price = instance.plan.price - 500
        payment, _ = Payment.objects.get_or_create(teacher=teacher)
        payment.add_earnings(adjusted_price)

        NotificationService.create_and_send(
            student.user,
            "subscription_active",
            f"تم تفعيل اشتراكك مع المعلم {teacher.user.last_name} بنجاح!",
            subscription_id=str(instance.uuid)
        )

    # Renewal
    elif instance.is_active and previous_end_date != instance.end_date and previous_end_date is not None:
        adjusted_price = instance.plan.price - 500
        payment, _ = Payment.objects.get_or_create(teacher=teacher)
        payment.add_earnings(adjusted_price)

        NotificationService.create_and_send(
            student.user,
            "subscription_renewed",
            f"تم تجديد اشتراكك مع المعلم {teacher.user.first_name} بنجاح!",
            subscription_id=str(instance.uuid)
        )

    if hasattr(_thread_local, 'previous_state'):
        del _thread_local.previous_state
