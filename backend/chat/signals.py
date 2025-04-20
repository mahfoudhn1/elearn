from django.db.models.signals import pre_save, post_save
from django.dispatch import receiver

from notifications.models import Notification
from .models import ChatMessage
from notifications.utils import send_notification

# Store original value before saving
@receiver(pre_save, sender=ChatMessage)
def cache_old_is_pinned(sender, instance, **kwargs):
    if instance.pk:
        try:
            old_instance = ChatMessage.objects.get(pk=instance.pk)
            instance._was_pinned = old_instance.is_pinned
        except ChatMessage.DoesNotExist:
            instance._was_pinned = False  # fallback
    else:
        instance._was_pinned = False  # new instance


@receiver(post_save, sender=ChatMessage)
def notify_on_new_pinned(sender, instance, created, **kwargs):
    if instance.is_pinned and (created or not instance._was_pinned):
        group = instance.group
        message= f"لديكم اعلان لدى '{group.name}' by {instance.sender.username}.";
        for student in group.students.all():
            Notification.objects.create(
                recipient=student.user,
                notification_type='scheduled',
                message=message,
                group_id=group.id
            )
            send_notification(
                student.user.id,{
                'type': 'messages',
                'message': message,
                'group_id': group.id
                }
                
            )
