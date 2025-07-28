from django.contrib import admin

from .models import *
# Register your models here.

admin.site.register(Group)

admin.site.register(StudentGroupRequest)
admin.site.register(GroupCourse)
admin.site.register(Quiz)
admin.site.register(Question)

admin.site.register(StudentAnswer)
