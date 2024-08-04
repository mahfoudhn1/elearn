# Generated by Django 5.0.7 on 2024-08-03 18:00

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('users', '0002_student_speciality_alter_user_groups_and_more'),
    ]

    operations = [
        migrations.CreateModel(
            name='ZoomMeeting',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('topic', models.CharField(max_length=255)),
                ('start_time', models.DateTimeField()),
                ('duration', models.IntegerField()),
                ('zoom_meeting_id', models.CharField(max_length=255, unique=True)),
                ('join_url', models.URLField()),
                ('teacher', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='users.teacher')),
            ],
        ),
    ]
