from django.db import models
from django.utils import timezone
from django.contrib.auth.models import AbstractUser, Group, Permission
from decimal import Decimal

class User(AbstractUser):
    ROLE_CHOICE=(
        ("teacher", "Teacher"),
        ("student", "Student")
    )
    role = models.CharField(max_length=10, choices=ROLE_CHOICE, null=True, blank=True)
    avatar_url = models.URLField(blank=True, null=True)  # Stores Google profile picture
    avatar_file = models.ImageField(upload_to='avatars/', null=True, blank=True)

    def get_avatar(self):
        """Return either uploaded image or Google profile picture."""
        return self.avatar_file.url if self.avatar_file else self.avatar_url
    zoom_access_token = models.CharField( null=True, blank=True)
    zoom_refresh_token = models.CharField( null=True, blank=True)
    zoom_token_expires_at = models.DateTimeField(null=True, blank=True)

    


class SchoolLevel(models.Model):
    name = models.CharField(max_length=100, unique=True)

    def __str__(self):
        return self.name


class Grade(models.Model):
    name = models.CharField(max_length=50)
    school_level = models.ForeignKey(SchoolLevel, on_delete=models.CASCADE, related_name="grades")

    def __str__(self):
        return f"{self.name} ({self.school_level.name})"


class FieldOfStudy(models.Model):
    name = models.CharField(max_length=100)

    def __str__(self):
        return f"{self.name}"

class SchoolChoice(models.TextChoices):
    PRIMARY = 'PRIMARY', 'Primary School'
    MIDDLE = 'MIDDLE', 'Middle School'
    SECONDARY = 'SECONDARY', 'Secondary School'
    HIGHER = 'HIGHER', 'Higher Education'

class subjsctChoice(models.TextChoices):
    MATHEMATICS = 'رياضيات', 'رياضيات'
    PHYSICS = 'فيزياء', 'فيزياء'
    CHEMISTRY = 'كيمياء', 'كيمياء'
    BIOLOGY = 'أحياء', 'أحياء'
    FRENCH = 'فرنسية', 'فرنسية'
    ARABIC = 'عربية', 'عربية'
    ENGLISH = 'إنجليزية', 'إنجليزية'
    HISTORY = 'تاريخ', 'تاريخ'
    GEOGRAPHY = 'جغرافيا', 'جغرافيا'
    PHILOSOPHY = 'فلسفة', 'فلسفة'
    ECONOMICS = 'اقتصاد', 'اقتصاد'


class Teacher(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="teacher")
    bio = models.TextField(max_length= 600, null=True, blank=True)
    profile_privet = models.BooleanField(default=True)
    teaching_level = models.CharField(max_length=20, choices = SchoolChoice.choices, null=True, blank=True) 
    teaching_subjects = models.CharField(max_length=20, choices = subjsctChoice.choices, null=True, blank=True) 
    price = models.IntegerField(default=1000)
    phone_number = models.CharField( max_length=10, null=True, blank=True)
    profession = models.CharField(max_length=100, null=True, blank=True)
    degree = models.CharField(max_length=100, null=True, blank=True)
    wilaya = models.CharField(max_length=20, null=True, blank=True)
    university = models.CharField(max_length=100, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        return f"{self.user.first_name} {self.user.last_name}"



class Student(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="student")
    teaching_level = models.CharField(max_length=20, choices = SchoolChoice.choices, null=True, blank=True) 

    phone_number = models.CharField(max_length=10, null=True, blank=True)
    wilaya = models.CharField(max_length=20, null=True, blank=True)
    grade = models.ForeignKey(Grade, on_delete=models.CASCADE, default=1)
    field_of_study = models.ForeignKey(FieldOfStudy, on_delete=models.CASCADE, default=1)
    
    def __str__(self) -> str:
        return f"{self.user.first_name} {self.user.last_name}"
    

class Payment(models.Model):
    teacher = models.OneToOneField(Teacher, on_delete=models.CASCADE, related_name='payment')
    current_balance = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    total_earned = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))

    def add_earnings(self, amount):
        amount_decimal = Decimal(str(amount))  # Convert incoming amount to Decimal
        self.current_balance = self.current_balance + amount_decimal  # Both are Decimal
        self.total_earned = self.total_earned + amount_decimal
        self.save()

    def mark_as_paid(self):
        if self.current_balance > 0:
            PaymentHistory.objects.create(
                teacher=self.teacher,
                amount=self.current_balance,
                payment_date=timezone.now()
            )
            self.current_balance = Decimal('0.00')
            self.save()

    def monthly_earnings(self, year, month):
        start_date = timezone.datetime(year, month, 1)
        end_date = (start_date + timezone.timedelta(days=31)).replace(day=1) - timezone.timedelta(seconds=1)
        total = PaymentHistory.objects.filter(
            teacher=self.teacher,
            payment_date__range=(start_date, end_date)
        ).aggregate(models.Sum('amount'))['amount__sum'] or Decimal('0.00')
        return total

    def __str__(self):
        return f"Payment for {self.teacher} - Balance: {self.current_balance}"

class PaymentHistory(models.Model):
    teacher = models.ForeignKey(Teacher, on_delete=models.CASCADE, related_name='payment_history')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    payment_date = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f"{self.amount} paid to {self.teacher} on {self.payment_date.strftime('%Y-%m-%d')}"