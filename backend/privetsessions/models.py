from django.db import models

# Create your models here.
class PrivetSession(models.Model):

    student = models.ForeignKey("users.Student", verbose_name=("students"), on_delete=models.CASCADE)
    teacher = models.ForeignKey("users.Teacher", verbose_name=("teachers"), on_delete=models.CASCADE)
    paid = models.BooleanField(default=False)
    session_date = models.DateField( auto_now=False, auto_now_add=False)
    notes = models.TextField(null=True, blank=True) 

    def __str__(self) :
        return f"privet session {self.student}"
    

STATUS_CHOICES = [
    ('pending', 'Pending'),
    ('accepted', 'Accepted'),
    ('rejected', 'Rejected'),
]

class PrivateSessionRequest(models.Model):
    student = models.ForeignKey('users.Student', on_delete=models.CASCADE)
    teacher = models.ForeignKey('users.Teacher', on_delete=models.CASCADE)
    requested_at = models.DateTimeField(auto_now_add=True)
    session_date = models.DateTimeField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    notes = models.TextField(null=True, blank=True) 

    def __str__(self):
        return f"Session Request from {self.student.user.username} to {self.teacher.user.username} on {self.session_date}"