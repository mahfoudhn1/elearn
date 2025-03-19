from django.db import models

from users.models import User

STATUS_CHOICES = [
    ('pending', 'Pending'),
    ('accepted', 'Accepted'),
    ('rejected', 'Rejected'),
    ('deleted', 'Deleted'),  # Added a new status for when the student deletes the session
]

class PrivateSessionRequest(models.Model):
    student = models.ForeignKey('users.Student', on_delete=models.CASCADE)
    teacher = models.ForeignKey('users.Teacher', on_delete=models.CASCADE)
    requested_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    student_notes = models.TextField(null=True, blank=True)
    teacher_notes = models.TextField(null=True, blank=True)
    proposed_date = models.DateTimeField(null=True, blank=True)  
    is_paied = models.BooleanField(default=False)
    def __str__(self):
        return f"Session Request from {self.student.user.username} to {self.teacher.user.username}"

class PrivateSession(models.Model):
    session_request = models.OneToOneField(PrivateSessionRequest, on_delete=models.CASCADE, related_name='session')
    session_date = models.DateTimeField()  # Final date and time for the session
    paid = models.BooleanField(default=False)

    def __str__(self):
        return f"Private Session on {self.session_date} between {self.session_request.student.user.username} and {self.session_request.teacher.user.username}"
    
class CheckSessionPaiment(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='check_session_paiment')
    PrivateSession = models.ForeignKey(PrivateSessionRequest, on_delete=models.CASCADE, related_name='check_session_paiment')
    check_image = models.ImageField(upload_to='checks/')
    is_verified = models.BooleanField(default=False)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Check uploaded by {self.user.username} for subscription {self.PrivateSession.id}"