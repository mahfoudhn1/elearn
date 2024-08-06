from django.db import models
from users.models import Teacher
from groups.models import Group

# Create your models here.
class ZoomMeeting(models.Model):
    teacher = models.ForeignKey(Teacher, on_delete=models.CASCADE)
    group = models.ForeignKey(Group, on_delete=models.CASCADE, null=True, blank=True)
    topic = models.CharField(max_length=255)
    start_time = models.DateTimeField()
    duration = models.IntegerField() 
    zoom_meeting_id = models.CharField(max_length=255, unique=True)
    join_url = models.URLField()
    agenda = models.TextField(blank=True, null=True) 

    def __str__(self):
        return self.topic