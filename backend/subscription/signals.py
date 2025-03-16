import logging
import threading
from django.db.models.signals import pre_save, post_save
from django.dispatch import receiver

from notifications.models import Notification
from notifications.utils import send_notification
from users.models import Payment

from .models import Subscription

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
    logger.info(f"Signal triggered: created={created}, raw={raw}, instance={instance}")
    if created or raw:
        logger.info("Skipping: New creation or raw data load")
        return

    update_fields = kwargs.get('update_fields')
    logger.info(f"update_fields: {update_fields}")

    previous_state = getattr(_thread_local, 'previous_state', {'is_active': None, 'end_date': None})
    previous_is_active = previous_state['is_active']
    previous_end_date = previous_state['end_date']

    # Handle teacher payment updates
    if instance.is_active and (previous_is_active is False or previous_is_active is None):
        logger.info(f"Subscription activated for {instance.teacher}, adding {instance.plan.price}")
        teacher = instance.teacher
        payment, _ = Payment.objects.get_or_create(teacher=teacher)
        payment.add_earnings(instance.plan.price)  # Price comes from SubscriptionPlan.price

        # Notify the student when subscription becomes active
        student = instance.student
        message = f"تم تفعيل اشتراكك مع المعلم {teacher.user.last_name} بنجاح!"
        Notification.objects.create(
            recipient=student.user,  # Assuming Student has a ForeignKey to User
            notification_type='subscription_active',
            message=message,
            subscription_id=instance.id  # Optional: link to subscription
        )
        send_notification(student.user.id, {
            'type': 'subscription_active',
            'message': message,
            'subscription_id': instance.id
        })

    # Renewal: end_date changed and is_active is True
    elif instance.is_active and previous_end_date != instance.end_date and previous_end_date is not None:
        logger.info(f"Subscription renewed for {instance.teacher}, adding {instance.plan.price}")
        teacher = instance.teacher
        payment, _ = Payment.objects.get_or_create(teacher=teacher)
        payment.add_earnings(instance.plan.price)  # Price comes from SubscriptionPlan.price

        # Notify the student when subscription is renewed
        student = instance.student
        message = f"تم تجديد اشتراكك مع المعلم {teacher.full_name} بنجاح!"
        Notification.objects.create(
            recipient=student.user,
            notification_type='subscription_renewed',
            message=message,
            subscription_id=instance.id
        )
        send_notification(student.user.id, {
            'type': 'subscription_renewed',
            'message': message,
            'subscription_id': instance.id
        })

    if hasattr(_thread_local, 'previous_state'):
        del _thread_local.previous_state