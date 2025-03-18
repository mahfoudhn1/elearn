from django.db import models

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
    student_notes = models.TextField(null=True, blank=True)  # Note from the student
    teacher_notes = models.TextField(null=True, blank=True)  # Note from the teacher
    proposed_date = models.DateTimeField(null=True, blank=True)  # Proposed date by the teacher

    def __str__(self):
        return f"Session Request from {self.student.user.username} to {self.teacher.user.username}"

class PrivateSession(models.Model):
    session_request = models.OneToOneField(PrivateSessionRequest, on_delete=models.CASCADE, related_name='session')
    session_date = models.DateTimeField()  # Final date and time for the session
    paid = models.BooleanField(default=False)

    def __str__(self):
        return f"Private Session on {self.session_date} between {self.session_request.student.user.username} and {self.session_request.teacher.user.username}"