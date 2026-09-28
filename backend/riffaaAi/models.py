from django.db import models
from django.contrib.auth import get_user_model
from django.db.models.signals import post_save
from django.dispatch import receiver

from core.models import UUIDModel
User = get_user_model()

class UserToken(UUIDModel):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='ai_token')
    tokens = models.PositiveIntegerField(default=2000000)

    def __str__(self):
        return f"{self.user.username} - {self.tokens} tokens"

@receiver(post_save, sender=User)
def create_user_token(sender, instance, created, **kwargs):
    if created:
        UserToken.objects.create(user=instance)

class AIInteraction(UUIDModel):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='ai_interactions')
    prompt = models.TextField()
    response = models.TextField(blank=True)
    pdf_file = models.FileField(upload_to='ai_pdfs/', null=True, blank=True)
    tokens_used = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username} - {self.created_at}"
