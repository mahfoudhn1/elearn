from datetime import timedelta
from unittest.mock import patch

from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient, APITestCase

from courses.models import Course, Lesson
from subscription.models import Subscription, SubscriptionPlan
from users.models import FieldOfStudy, Grade, SchoolLevel, Student, Teacher, User

from .models import VideoAsset


def make_teacher(username="teacher"):
    user = User.objects.create_user(
        username=username,
        email=f"{username}@example.com",
        password="pass12345",
        role="teacher",
    )
    return Teacher.objects.create(user=user)


class VideoAssetAPITests(APITestCase):
    def setUp(self):
        self.teacher = make_teacher("teacher-video")
        self.client = APIClient()
        self.client.force_authenticate(self.teacher.user)

    def test_init_upload_returns_presign(self):
        response = self.client.post(
            reverse("video-asset-init"),
            {"filename": "demo.mp4", "mime_type": "video/mp4", "size_bytes": 1024},
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.data)
        self.assertIn("upload_url", response.data)
        self.assertIn("id", response.data)

    def test_student_cannot_init_upload(self):
        student_user = User.objects.create_user(
            username="student-video",
            email="student-video@example.com",
            password="pass12345",
            role="student",
        )
        self.client.force_authenticate(student_user)
        response = self.client.post(
            reverse("video-asset-init"),
            {"filename": "demo.mp4", "mime_type": "video/mp4", "size_bytes": 1024},
            format="json",
        )
        self.assertEqual(response.status_code, 403)

    def test_teacher_can_delete_uploaded_asset(self):
        asset = VideoAsset.objects.create(
            owner=self.teacher,
            original_filename="demo.mp4",
            mime_type="video/mp4",
            size_bytes=1024,
            r2_key="videos/test/demo.mp4",
            status=VideoAsset.Status.READY,
        )
        with patch("media_assets.views.R2MediaService.delete_object", return_value=True):
            response = self.client.delete(reverse("video-asset-detail", args=[asset.uuid]))
        self.assertEqual(response.status_code, 204)
        self.assertFalse(VideoAsset.objects.filter(pk=asset.pk).exists())

    def test_student_can_get_playback_for_accessible_course(self):
        school = SchoolLevel.objects.create(name="High School")
        grade = Grade.objects.create(name="Grade 12", school_level=school)
        field = FieldOfStudy.objects.create(name="Science", grade=grade)
        student_user = User.objects.create_user(
            username="student-playback",
            email="student-playback@example.com",
            password="pass12345",
            role="student",
        )
        student = Student.objects.create(user=student_user, grade=grade, field_of_study=field)
        course = Course.objects.create(teacher=self.teacher, title="Accessible Course")
        asset = VideoAsset.objects.create(
            owner=self.teacher,
            original_filename="demo.mp4",
            mime_type="video/mp4",
            size_bytes=1024,
            r2_key="videos/test/demo.mp4",
            status=VideoAsset.Status.READY,
        )
        Lesson.objects.create(course=course, title="Lesson 1", video_asset=asset)
        plan = SubscriptionPlan.objects.create(
            name="Monthly",
            price=1000,
            duration_days=30,
            description="Monthly access",
        )
        Subscription.objects.create(
            student=student,
            teacher=self.teacher,
            plan=plan,
            start_date=timezone.now().date(),
            end_date=timezone.now() + timedelta(days=30),
            is_active=True,
        )

        self.client.force_authenticate(student_user)
        with patch("media_assets.views.R2MediaService.presign_download", return_value="https://example.test/playback.mp4"):
            response = self.client.get(reverse("video-asset-playback", args=[asset.uuid]))
        self.assertEqual(response.status_code, 200, response.data)
        self.assertIn("url", response.data)

    def test_unsubscribed_student_cannot_get_playback(self):
        school = SchoolLevel.objects.create(name="High School")
        grade = Grade.objects.create(name="Grade 12", school_level=school)
        field = FieldOfStudy.objects.create(name="Science", grade=grade)
        student_user = User.objects.create_user(
            username="student-no-access",
            email="student-no-access@example.com",
            password="pass12345",
            role="student",
        )
        Student.objects.create(user=student_user, grade=grade, field_of_study=field)
        course = Course.objects.create(teacher=self.teacher, title="Locked Course")
        asset = VideoAsset.objects.create(
            owner=self.teacher,
            original_filename="demo.mp4",
            mime_type="video/mp4",
            size_bytes=1024,
            r2_key="videos/test/demo.mp4",
            status=VideoAsset.Status.READY,
        )
        Lesson.objects.create(course=course, title="Locked Lesson", video_asset=asset)

        self.client.force_authenticate(student_user)
        response = self.client.get(reverse("video-asset-playback", args=[asset.uuid]))
        self.assertEqual(response.status_code, 403)
