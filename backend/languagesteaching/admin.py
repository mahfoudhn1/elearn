from django.contrib import admin
from .models import Language, LanguageLevel, StudentLanguageProficiency, Question
# Register your models here.
admin.site.register(Language)
admin.site.register(LanguageLevel)
admin.site.register(Question)
admin.site.register(StudentLanguageProficiency)