# yourapp/management/commands/create_test_students.py

from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from users.models import Student ,SchoolLevel, Grade, FieldOfStudy  # Adjust with your actual app name

from django.contrib.auth import get_user_model  # Use this to get the custom user model
User = get_user_model()  # Get the custom user model


class Command(BaseCommand):
    help = 'Create test students'

    def handle(self, *args, **kwargs):
        students_data = [
           
            {'username': 'user1', 'password': 'password123', 'email': 'user1@example.com', 'first_name': 'John', 'last_name': 'Doe'},
            {'username': 'user2', 'password': 'password123', 'email': 'user2@example.com', 'first_name': 'John', 'last_name': 'Doe'},
            {'username': 'user3', 'password': 'password123', 'email': 'user3@example.com', 'first_name': 'John', 'last_name': 'Doe'},
            {'username': 'user4', 'password': 'password123', 'email': 'user4@example.com', 'first_name': 'John', 'last_name': 'Doe'},
            {'username': 'user5', 'password': 'password123', 'email': 'user5@example.com', 'first_name': 'John', 'last_name': 'Doe'},
            {'username': 'user6', 'password': 'password123', 'email': 'user6@example.com', 'first_name': 'John', 'last_name': 'Doe'},        ]

        for student_data in students_data:
            user, created = User.objects.get_or_create(
                username=student_data['username'],
                defaults={'password': student_data['password'], 'email': student_data['email']}
            )
            if created:
                user.set_password(student_data['password'])  # Use set_password to hash the password
                user.save()
                self.stdout.write(self.style.SUCCESS(f'User {user.username} created.'))

            # Create student instance
            student, created = Student.objects.get_or_create(
                user=user,
                defaults={
                    'first_name': student_data['first_name'],
                    'last_name': student_data['last_name'],
                    'phone_number': '1234567890',  # Replace with actual phone numbers
                    'wilaya': 'Some Wilaya',  # Replace with actual wilaya
                    'school_level': SchoolLevel.objects.get(pk=1),  # Adjust as needed
                    'grade': Grade.objects.get(pk=1),  # Adjust as needed
                    'field_of_study': FieldOfStudy.objects.get(pk=2),  # Adjust as needed
                }
            )
            if created:
                self.stdout.write(self.style.SUCCESS(f'Student {student.user.first_name} {student.user.last_name} created.'))
            else:
                self.stdout.write(self.style.WARNING(f'Student for user {user.username} already exists.'))

