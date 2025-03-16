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
        """Check if the subscription is active and not expired."""
        if not self.is_active or not self.end_date:
            return False
        return self.end_date >= timezone.now().date()

    def renew(self):
        self.start_date = timezone.now().date()
        self.end_date = self.start_date + timezone.timedelta(days=self.plan.duration_days)
        self.add_subs_to_history("Renewed")
        self.save()

    def activate(self):
        """Activate the subscription and set start_date and end_date."""
        if not self.is_active:
            self.is_active = True
            self.start_date = timezone.now().date()
            self.end_date = self.start_date + timezone.timedelta(days=self.plan.duration_days)
            self.add_subs_to_history("Activated")
            self.save(update_fields=['is_active', 'start_date', 'end_date', 'subs_history'])

    def renew(self):
        """Renew the subscription, updating start_date and end_date."""
        self.start_date = timezone.now().date()
        self.end_date = self.start_date + timezone.timedelta(days=self.plan.duration_days)
        self.is_active = True  # Ensure it stays active
        self.add_subs_to_history("Renewed")
        self.save(update_fields=['start_date', 'end_date', 'is_active', 'subs_history'])

    def cancel(self):
        """Cancel the subscription."""
        self.is_active = False
        self.add_subs_to_history("Cancelled")
        self.save(update_fields=['is_active', 'subs_history'])

    def add_subs_to_history(self, status):
        """Add an entry to subscription history."""
        if not isinstance(self.subs_history, list):
            self.subs_history = []
        self.subs_history.append({
            "status": status,
            "date": timezone.now().date().isoformat()
        })

    def __str__(self):
        return f'{self.student} -> {self.teacher}'
    

