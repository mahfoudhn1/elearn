from django.db import models


class Meeting(models.Model):
    teacher = models.ForeignKey("users.Teacher", on_delete=models.CASCADE)
    room_name = models.CharField(max_length=255)
    students = models.ManyToManyField("users.Student", related_name="students", blank=True)
    group = models.ForeignKey("groups.Group", verbose_name=("groups"), on_delete=models.CASCADE, null=True, blank=True)
    start_time = models.DateTimeField(auto_now_add=True)
    end_time = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Room: {self.id} {self.room_name} by {self.teacher.first_name}"