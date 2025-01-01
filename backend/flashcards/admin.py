from django.contrib import admin
from .models import Deck, Deckprogress, Flashcard
# Register your models here.

admin.site.register(Deck)
admin.site.register(Flashcard)
admin.site.register(Deckprogress)