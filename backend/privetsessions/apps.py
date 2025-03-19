from django.apps import AppConfig


class PrivetsessionsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'privetsessions'


    def ready(self):
        import privetsessions.signals 