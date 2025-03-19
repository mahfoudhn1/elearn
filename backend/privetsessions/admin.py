from django.contrib import admin
from .models import PrivateSessionRequest, PrivateSession, CheckSessionPaiment
# Register your models here.
admin.site.register(PrivateSessionRequest)
admin.site.register(PrivateSession)
@admin.register(CheckSessionPaiment)
class CheckSessionPaimentAdmin(admin.ModelAdmin):
    list_display = ('user', 'PrivateSession', 'is_verified', 'uploaded_at')
    list_filter = ('is_verified',)
    search_fields = ('user__username', 'PrivateSession__id')