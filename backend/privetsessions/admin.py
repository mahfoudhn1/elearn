from django.contrib import admin
from .models import PrivateSessionRequest, PrivateSession
# Register your models here.
admin.site.register(PrivateSessionRequest)
admin.site.register(PrivateSession)