from django.apps import AppConfig


class AssessmentConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "assessment"

    def ready(self):
        # Register signal receivers (mastery cache refresh on new evidence).
        from . import signals  # noqa: F401
