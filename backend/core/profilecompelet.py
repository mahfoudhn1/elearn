from django.shortcuts import redirect
from django.urls import reverse
from django.conf import settings

class EnsureProfileCompleteMiddleware:
    """
    Middleware that checks if the user's profile is complete.
    If not, redirects to the complete profile page.
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.user.is_authenticated:
            profile = request.user.profile  # Assuming you have a `Profile` model linked to the `User` model.
            if not profile.is_complete:  # You need to implement this method or logic in your Profile model.
                if request.path != reverse('complete-profile'):  # Avoid redirect loop.
                    return redirect('complete-profile')

        response = self.get_response(request)
        return response
