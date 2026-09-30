from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from media_assets.models import VideoAsset


class Command(BaseCommand):
    help = "Remove stale pending video uploads that were never finalized."

    def handle(self, *args, **options):
        cutoff = timezone.now() - timedelta(hours=12)
        deleted_count, _ = VideoAsset.objects.filter(
            status=VideoAsset.Status.PENDING,
            created_at__lt=cutoff,
        ).delete()
        self.stdout.write(self.style.SUCCESS(f"Deleted {deleted_count} stale pending media assets."))
