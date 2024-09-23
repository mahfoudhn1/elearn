from django.contrib import admin

from .models import *
# Register your models here.

admin.site.register(Group)
admin.site.register(SchoolLevel)
admin.site.register(Grade)
admin.site.register(FieldOfStudy)
admin.site.register(StudentGroupRequest)