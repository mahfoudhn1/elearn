from django.apps import AppConfig


class JitsiConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'jitsi'
    def ready(self):
        import jitsi.signal


   