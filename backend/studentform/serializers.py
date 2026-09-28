from rest_framework import serializers
from .models import StudentForm

from core.serializers import UUIDModelSerializer, UUIDRelatedField
class StudentFormSerializer(UUIDModelSerializer):
    class Meta:
        model = StudentForm
        fields = [
            "id",
            "role",
            "name",
            "family_name",
            "phone_number",
            "education_level",
            "year",
            "branch",
            "language_choice",
            "subjects",
        ]
