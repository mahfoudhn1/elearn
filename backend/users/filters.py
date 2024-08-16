import django_filters
from django.db.models import Q
from .models import Teacher

class TeacherFilter(django_filters.FilterSet):
    teaching_level = django_filters.CharFilter(lookup_expr='icontains')
    teaching_subjects = django_filters.CharFilter(lookup_expr='icontains')
    phone_number = django_filters.CharFilter(lookup_expr='icontains')
    first_name = django_filters.CharFilter(lookup_expr='icontains')
    last_name = django_filters.CharFilter(lookup_expr='icontains')
    wilaya = django_filters.CharFilter(lookup_expr='icontains')
    university = django_filters.CharFilter(lookup_expr='icontains')
    
    # Search filter for name
    search = django_filters.CharFilter(method='filter_by_name')

    class Meta:
        model = Teacher
        fields = ['teaching_level', 'teaching_subjects', 'phone_number', 'first_name', 'last_name', 'wilaya', 'university', 'search']

    def filter_by_name(self, queryset, name, value):
        return queryset.filter(
            Q(first_name__icontains=value) | Q(last_name__icontains=value)
        )