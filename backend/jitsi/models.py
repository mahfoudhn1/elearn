from django.db import models

from users.models import User


class Meeting(models.Model):
    teacher = models.ForeignKey("users.Teacher", on_delete=models.CASCADE)
    room_name = models.CharField(max_length=255)
    students = models.ManyToManyField("users.Student", related_name="students", blank=True)
    group = models.ForeignKey("groups.Group", verbose_name=("groups"), on_delete=models.CASCADE, null=True, blank=True)
    is_active = models.BooleanField(default=False)
    privetsession = models.ForeignKey("privetsessions.PrivateSessionRequest", verbose_name=("privetsessions"), on_delete=models.CASCADE, null=True, blank=True)
    start_time = models.DateTimeField(auto_now_add=True)
    end_time = models.DateTimeField(auto_now_add=True)
    current_speaker = models.ForeignKey(
        User, 
        null=True, 
        blank=True,
        on_delete=models.SET_NULL,
        related_name='speaking_in'
    )
    def __str__(self):
        return f"Room: {self.id} {self.room_name} by {self.teacher.user.first_name}"