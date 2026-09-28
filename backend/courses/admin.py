from django.contrib import admin

from .models import (
    Course,
    Lesson,
    Material,
    Survey,
    SurveyAnswer,
    SurveyChoice,
    SurveyQuestion,
    SurveyResponse,
    UserLessonProgress,
)


class LessonInline(admin.TabularInline):
    model = Lesson
    extra = 0


class MaterialInline(admin.TabularInline):
    model = Material
    extra = 0


class SurveyChoiceInline(admin.TabularInline):
    model = SurveyChoice
    extra = 1


class SurveyQuestionInline(admin.StackedInline):
    model = SurveyQuestion
    extra = 0
    show_change_link = True


@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = ("id", "title", "teacher", "is_published", "created_at")
    list_filter = ("is_published", "teacher")
    search_fields = ("title", "description")
    inlines = [LessonInline, MaterialInline]


@admin.register(Lesson)
class LessonAdmin(admin.ModelAdmin):
    list_display = ("id", "title", "course", "order")
    list_filter = ("course",)
    search_fields = ("title",)
    inlines = [MaterialInline]


@admin.register(Material)
class MaterialAdmin(admin.ModelAdmin):
    list_display = ("id", "title", "course", "lesson", "created_at")


@admin.register(Survey)
class SurveyAdmin(admin.ModelAdmin):
    list_display = ("id", "title", "course", "lesson", "is_published")
    list_filter = ("is_published", "course")
    inlines = [SurveyQuestionInline]


@admin.register(SurveyQuestion)
class SurveyQuestionAdmin(admin.ModelAdmin):
    list_display = ("id", "text", "survey", "question_type", "points", "order")
    inlines = [SurveyChoiceInline]


@admin.register(SurveyResponse)
class SurveyResponseAdmin(admin.ModelAdmin):
    list_display = ("id", "survey", "student", "score", "submitted_at")


admin.site.register(UserLessonProgress)
admin.site.register(SurveyChoice)
admin.site.register(SurveyAnswer)
