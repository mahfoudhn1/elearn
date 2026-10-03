"""
URL configuration for core project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from django.conf.urls.static import static
from django.conf import settings

urlpatterns = [
    path('api/admin-8J3z9kP2YbQqLmNvX1rT/', admin.site.urls),

    path("api/", include("users.urls")),
    path("api/subscriptions/", include("subscription.urls")),
    path("api/livestream/", include("livestream.urls")),
    path("api/live/", include("jitsi.urls")),
    path("api/courses/", include("courses.urls")),
    path("api/media/", include("media_assets.urls")),
    path("api/groups/", include("groups.urls")),
    path("api/", include("schedule.urls")),
    path("api/privet/", include("privetsessions.urls")),
    path("api/flashcards/", include("flashcards.urls")),
    path("api/notes/", include("notes.urls")),
    path("api/chat/", include("chat.urls")),
    path("api/lan/", include("languagesteaching.urls")),
    # path("api/forms/", include("froms.urls")),
    path("api/studentform/", include("studentform.urls")),

    path("api/notifications/", include("notifications.urls")),
    path("api/ai/", include("riffaaAi.urls")),
    path("api/tracking/", include("tracking.urls")),
    path("api/planner/", include("planner.urls")),

] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
