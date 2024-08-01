from django.db import models
from users.models import  Teacher, Student
from django.utils import timezone

class Subscription(models.Model):
    
    teacher = models.ForeignKey(Teacher, on_delete=models.CASCADE)
    student = models.ForeignKey(Student, on_delete=models.CASCADE)
    start_date = models.DateField(auto_now_add=True)
    end_date = models.DateField()
    is_active = models.BooleanField(default=True)
    subs_history = models.JSONField(default=list)

    def renew(self):
        self.start_date = timezone.now().date()
        self.end_date =  self.start_date + timezone.timedelta(days=30)
        self.save()


    def cancel(self):
        self.is_active = False
        self.save()

    def add_status_to_history(self, status):

        self.subs_history.append({
            "status": status,
            "date": timezone.now().date()
        })
        self.save()

    def __str__(self):
        return f'{self.student} -> {self.teacher}'
    
