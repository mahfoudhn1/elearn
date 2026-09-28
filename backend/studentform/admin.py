from django.contrib import admin
from django import forms
from .models import StudentForm

class StudentFormAdminForm(forms.ModelForm):
    # Custom field to edit subjects as multiline text
    subjects_text = forms.CharField(
        widget=forms.Textarea,
        required=False,
        help_text="Enter one subject per line"
    )

    class Meta:
        model = StudentForm
        fields = "__all__"

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if self.instance and self.instance.subjects:
            # Convert list to multiline text for the admin
            self.fields["subjects_text"].initial = "\n".join(self.instance.subjects)

    def clean(self):
        cleaned_data = super().clean()
        subjects_text = cleaned_data.get("subjects_text", "")
        # Convert multiline text back to list
        cleaned_data["subjects"] = [s.strip() for s in subjects_text.splitlines() if s.strip()]
        return cleaned_data

class StudentFormAdmin(admin.ModelAdmin):
    form = StudentFormAdminForm
    list_display = ('name', 'family_name', 'role', 'education_level', 'year', 'branch', 'language_choice', 'get_subjects')
    list_filter = ('role', 'education_level', 'year', 'branch', 'language_choice')
    search_fields = ('name', 'family_name', 'phone_number')

    # Show subjects nicely in list view
    def get_subjects(self, obj):
        return ", ".join(obj.subjects)
    get_subjects.short_description = "Subjects"

admin.site.register(StudentForm, StudentFormAdmin)
