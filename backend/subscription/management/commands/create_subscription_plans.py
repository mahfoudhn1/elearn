from django.core.management.base import BaseCommand

from subscription.models import SubscriptionPlan


class Command(BaseCommand):
    help = "Create the default subscription plans"

    def handle(self, *args, **kwargs):
        plans = [
            {
                "name": "اشتراك شهري",
                "price": "1500.00",
                "duration_days": 30,
                "description": "الخطة الشهرية",
            },
            {
                "name": "اشتراك فصلي",
                "price": "4500.00",
                "duration_days": 90,
                "description": "الخطة الفصلية",
            },
            {
                "name": "اشتراك سنوي",
                "price": "12000.00",
                "duration_days": 365,
                "description": "الخطة السنوية",
            },
        ]

        for data in plans:
            plan, created = SubscriptionPlan.objects.get_or_create(
                name=data["name"], defaults=data
            )
            if created:
                self.stdout.write(
                    self.style.SUCCESS(f"Plan '{plan.name}' created.")
                )
            else:
                self.stdout.write(
                    self.style.WARNING(f"Plan '{plan.name}' already exists.")
                )
