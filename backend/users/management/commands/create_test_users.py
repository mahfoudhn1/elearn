from django.test import TestCase

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model  # Use this to get the custom user model
User = get_user_model()  # Get the custom user model

class Command(BaseCommand):
    help = 'Create test users'

    def handle(self, *args, **kwargs):
        users_data = [
            {'username': 'user1', 'password': 'password123', 'email': 'user1@example.com', 'role':"student"},
            {'username': 'user2', 'password': 'password123', 'email': 'user2@example.com', 'role':"student"},
            {'username': 'user3', 'password': 'password123', 'email': 'user3@example.com', 'role':"student"},
            {'username': 'user4', 'password': 'password123', 'email': 'user4@example.com', 'role':"student"},
            {'username': 'user5', 'password': 'password123', 'email': 'user5@example.com', 'role':"student"},
            {'username': 'user6', 'password': 'password123', 'email': 'user6@example.com', 'role':"student"},

        ]

        for user_data in users_data:
            user, created = User.objects.get_or_create(
                username=user_data['username'],
                defaults={'email': user_data['email']}
            )
            if created:
                user.set_password(user_data['password'])  # Use set_password to hash the password
                user.role = user_data['role']  # Set the role
                user.save()
                self.stdout.write(self.style.SUCCESS(f'User {user.username} created with role {user.role}.'))
            else:
                # If the user already exists, check if the role needs to be updated
                updated = False
                if user.role != user_data['role']:
                    user.role = user_data['role']  # Update the role
                    user.save()
                    updated = True

                if updated:
                    self.stdout.write(self.style.SUCCESS(f'User {user.username} updated with role {user.role}.'))
                else:
                    self.stdout.write(self.style.WARNING(f'User {user.username} already exists with role {user.role}.'))

           
