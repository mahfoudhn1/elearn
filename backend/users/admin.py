from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.models import User
from .models import User as CustomUser
from .models import Module ,Grade ,Speciality ,Teacher ,Student

class UserAdmin(BaseUserAdmin):
    model = CustomUser
    list_display = ('username', 'email', 'first_name', 'last_name', 'is_staff', 'is_active')
    list_filter = ('is_staff', 'is_active')
    search_fields = ('username', 'email', 'first_name', 'last_name')
    ordering = ('username',)
    

admin.site.register(CustomUser, UserAdmin)
admin.site.register(Teacher)
admin.site.register(Student)
admin.site.register(Speciality)
admin.site.register(Grade)
admin.site.register(Module)
