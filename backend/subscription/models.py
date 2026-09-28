from django.db import models
from users.models import  Teacher, Student, User
from django.utils import timezone


from core.models import UUIDModel
class SubscriptionPlan(UUIDModel):
    name = models.CharField(max_length=100)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    duration_days = models.IntegerField()
    description = models.TextField(blank=True, null=True)
    
    def __str__(self):
        return f"{self.name} - {self.price} DZD for {self.duration_days} days"

class Subscription(UUIDModel):
    
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
        end_date = self.end_date.date() if hasattr(self.end_date, "date") else self.end_date
        return end_date >= timezone.now().date()

    def has_access_history(self):
        """Return whether this subscription has ever granted course access."""
        if self.is_active_subscription():
            return True
        return any(
            entry.get("status") in {"Activated", "Renewed"}
            for entry in (self.subs_history or [])
            if isinstance(entry, dict)
        )

    def content_cutoff(self):
        """Return the last access moment, or ``None`` for active access."""
        if self.is_active_subscription():
            return None

        cancelled_dates = [
            entry.get("date")
            for entry in (self.subs_history or [])
            if isinstance(entry, dict) and entry.get("status") == "Cancelled"
        ]
        if cancelled_dates:
            return timezone.datetime.fromisoformat(max(cancelled_dates)).replace(
                hour=23, minute=59, second=59, microsecond=999999,
                tzinfo=timezone.get_current_timezone(),
            )

        if self.end_date:
            cutoff = self.end_date
            if not hasattr(cutoff, "time"):
                cutoff = timezone.datetime.combine(cutoff, timezone.datetime.max.time())
            if timezone.is_naive(cutoff):
                cutoff = timezone.make_aware(cutoff)
            return cutoff

        return None

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
    


class CheckUpload(UUIDModel):
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='check_uploads')
    subscription = models.ForeignKey('Subscription', on_delete=models.CASCADE, related_name='check_uploads')
    check_image = models.ImageField(upload_to='checks/')
    is_verified = models.BooleanField(default=False)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Check uploaded by {self.student.username} for subscription {self.subscription.id}"























