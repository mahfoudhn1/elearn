from django.contrib import admin
from .models import Subscription,  SubscriptionPlan
# Register your models here.


admin.site.register(Subscription)


@admin.register(SubscriptionPlan)
class SubscriptionPlanAdmin(admin.ModelAdmin):
    list_display = ('name', 'price', 'duration_days')