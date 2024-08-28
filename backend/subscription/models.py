from django.db import models
from users.models import  Teacher, Student
from django.utils import timezone


class SubscriptionPlan(models.Model):
    name = models.CharField(max_length=100)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    duration_days = models.IntegerField()
    description = models.TextField(blank=True, null=True)
    
    def __str__(self):
        return f"{self.name} - {self.price} DZD for {self.duration_days} days"

class Subscription(models.Model):
    
    teacher = models.ForeignKey(Teacher, on_delete=models.CASCADE)
    student = models.ForeignKey(Student, on_delete=models.CASCADE)
    plan = models.ForeignKey(SubscriptionPlan, on_delete=models.CASCADE, null=True)
    start_date = models.DateField(auto_now_add=True)
    end_date = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=False)
    subs_history = models.JSONField(default=list, null=True, blank=True)

    def is_active_subscription(self):
        return self.is_active and self.end_date >= timezone.now().date()

    def renew(self):
        self.start_date = timezone.now().date()
        self.end_date = self.start_date + timezone.timedelta(days=self.plan.duration_days)
        self.add_subs_to_history("Renewed")
        self.save()

    def cancel(self):
        self.is_active = False
        self.add_subs_to_history("Cancelled")
        self.save()

    def add_subs_to_history(self, status):
        self.subs_history.append({
            "status": status,
            "date": timezone.now().date().isoformat()
        })
        self.save()

    def __str__(self):
        return f'{self.student} -> {self.teacher}'