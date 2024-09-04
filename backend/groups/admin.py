from django.contrib import admin

from .models import *
# Register your models here.
@admin.register(Schedule)
class ScheduleAdmin(admin.ModelAdmin):
    list_display = ['day_of_week', 'start_time', 'end_time']
    
admin.site.register(Group)
admin.site.register(SchoolLevel)
admin.site.register(Grade)
admin.site.register(FieldOfStudy)