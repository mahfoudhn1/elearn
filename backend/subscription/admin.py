from time import timezone
from django.contrib import admin

from users.models import Payment, PaymentHistory
from .models import Subscription,  SubscriptionPlan
from django.utils.html import format_html

# @admin.register(Subscription)
# class SubscriptionAdmin(admin.ModelAdmin):
#     list_display = ('student', 'teacher', 'plan', 'start_date', 'end_date', 'is_active')
#     list_filter = ('is_active', 'plan')
#     search_fields = ('student__name', 'teacher__name')

#     def save_model(self, request, obj, form, change):
#         if obj.is_active and not obj.start_date:
#             obj.start_date = timezone.now().date()  # Set start_date to today
#             print(obj.start_date)
#             print(obj.plan.duration_days)
#             obj.end_date = obj.start_date + timezone.timedelta(days=obj.plan.duration_days)  # Set end_date
#             obj.add_subs_to_history("Activated")  # Log activation in history
        
#         # Call the superclass save_model to save the object
#         super().save_model(request, obj, form, change)

@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ('teacher', 'current_balance', 'total_earned', 'mark_as_paid_button')
    list_filter = ('teacher',)
    search_fields = ('teacher__name',)
    actions = ['mark_selected_as_paid']

    def mark_as_paid_button(self, obj):
        return format_html(
            '<a class="button" href="{}">Mark as Paid</a>',
            f'/admin/your_app/payment/{obj.id}/mark_as_paid/'
        )
    mark_as_paid_button.short_description = 'Action'

    def mark_selected_as_paid(self, request, queryset):
        for payment in queryset:
            payment.mark_as_paid()
        self.message_user(request, f"{queryset.count()} payment(s) marked as paid.")
    mark_selected_as_paid.short_description = "Mark selected payments as paid"

@admin.register(PaymentHistory)
class PaymentHistoryAdmin(admin.ModelAdmin):
    list_display = ('teacher', 'amount', 'payment_date')
    list_filter = ('payment_date', 'teacher')
    search_fields = ('teacher__name',)

@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = ('student', 'teacher', 'plan', 'start_date', 'end_date', 'is_active')
    list_filter = ('is_active', 'teacher', 'plan')
    search_fields = ('student__user__username', 'teacher__name')
    actions = ['activate_subscriptions']

    def activate_subscriptions(self, request, queryset):
        for subscription in queryset:
            if not subscription.is_active:
                subscription.activate()
        self.message_user(request, f"{queryset.count()} subscription(s) activated.")
    activate_subscriptions.short_description = "Activate selected subscriptions"

admin.site.register(SubscriptionPlan)

# @admin.register(SubscriptionPlan)
# class SubscriptionPlanAdmin(admin.ModelAdmin):
#     list_display = ('name', 'price', 'duration_days')