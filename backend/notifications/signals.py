from django.dispatch import receiver
from django.db.models.signals import post_save
from .utils import send_notification
from jitsi.models import Meeting
from groups.models import Schedule


# @receiver(post_save, sender=Schedule)
# def notify_students_schedule(sender, instance, created, **kwargs):
#     if created:
#         group = instance.group
#         students = group.students.all()
#         for student in students:
#             send_notification(
#                 student.id,
#                 {"message": f"Teacher {instance.teacher.username} scheduled a new event in {group.name}."}
#             )

# @receiver(post_save, sender=Meeting)
# def notify_students_live_stream(sender, instance, **kwargs):
#     # Check if is_active was updated to True
#     if instance.is_active:
#         try:
#             old_instance = Meeting.objects.get(pk=instance.pk)
#             if not old_instance.is_active and instance.is_active:  # is_active changed from False to True
#                 group = instance.group
#                 students = group.students.all()
#                 for student in students:
#                     send_notification(
#                         student.id,
#                         {"message": f"Teacher {instance.teacher.username} started a live stream in {group.name}."}
#                     )
#         except Meeting.DoesNotExist:
#             pass  # New instance, no old value to compare