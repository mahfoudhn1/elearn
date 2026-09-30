import logging

from django.conf import settings
from django.core.exceptions import PermissionDenied as DjangoPermissionDenied
from django.shortcuts import get_object_or_404
from rest_framework import serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from core.views import UUIDLookupMixin
from courses.access import is_course_accessible
from courses.models import Lesson
from .models import VideoAsset
from .services import R2MediaService
from courses.permissions import get_teacher

logger = logging.getLogger("media_assets.uploads")


class VideoAssetSerializer(serializers.ModelSerializer):
    class Meta:
        model = VideoAsset
        fields = [
            "id",
            "owner",
            "r2_key",
            "original_filename",
            "mime_type",
            "size_bytes",
            "duration_seconds",
            "status",
            "created_at",
        ]
        read_only_fields = ["id", "owner", "r2_key", "status", "created_at"]


class VideoAssetViewSet(UUIDLookupMixin, viewsets.ModelViewSet):
    serializer_class = VideoAssetSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        teacher = get_teacher(self.request.user)
        if not teacher:
            return VideoAsset.objects.none()
        return VideoAsset.objects.filter(owner=teacher)

    def perform_create(self, serializer):
        teacher = get_teacher(self.request.user)
        if not teacher:
            raise PermissionDenied("Only teachers can manage video assets.")
        serializer.save(owner=teacher)

    def perform_destroy(self, instance):
        instance.delete()

    def destroy(self, request, *args, **kwargs):
        asset = VideoAsset.objects.get(uuid=kwargs.get("pk"))
        teacher = get_teacher(request.user)
        if not teacher or asset.owner_id != teacher.id:
            raise PermissionDenied("You can only delete your own uploads.")

        service = R2MediaService()
        if asset.r2_key:
            service.delete_object(asset.r2_key)
        self.perform_destroy(asset)
        return Response(status=status.HTTP_204_NO_CONTENT)

    def _can_playback(self, user, asset):
        if get_teacher(user) and asset.owner_id == get_teacher(user).id:
            return True

        student = getattr(user, "student", None)
        if not student:
            return False

        lessons = Lesson.objects.filter(video_asset=asset).select_related("course")
        return any(is_course_accessible(student, lesson.course) for lesson in lessons)

    @action(detail=False, methods=["post"], url_path="init", url_name="init")
    def init_upload(self, request):
        teacher = get_teacher(request.user)
        if not teacher:
            raise PermissionDenied("Only teachers can upload video assets.")

        filename = request.data.get("filename") or "upload.mp4"
        mime_type = request.data.get("mime_type") or "video/mp4"
        size_bytes = int(request.data.get("size_bytes") or 0)

        if mime_type not in R2MediaService.ALLOWED_MIME_TYPES:
            raise ValidationError({"mime_type": "Only mp4, webm, and mov uploads are supported."})

        max_size = getattr(settings, "MEDIA_VIDEO_MAX_SIZE_BYTES", 5 * 1024 * 1024 * 1024)
        if size_bytes > max_size:
            raise ValidationError({"size_bytes": "Video exceeds the configured maximum size."})

        asset = VideoAsset.objects.create(
            owner=teacher,
            original_filename=filename,
            mime_type=mime_type,
            size_bytes=size_bytes,
        )
        service = R2MediaService()
        key = service.build_key(str(teacher.uuid), filename)
        asset.r2_key = key
        asset.save(update_fields=["r2_key"])

        if size_bytes > R2MediaService.MULTIPART_THRESHOLD_BYTES:
            try:
                upload = service.create_multipart_upload(key, mime_type) or {}
            except Exception:
                asset.status = VideoAsset.Status.FAILED
                asset.save(update_fields=["status"])
                logger.exception("multipart init failed asset=%s key=%s", asset.uuid, key)
                raise ValidationError(
                    {"detail": "Could not start the upload. Please try again."}
                )
            upload_id = upload.get("UploadId")
            part_size, part_count = service.plan_parts(size_bytes)
            short = {
                "id": str(asset.uuid),
                "key": key,
                "upload_id": upload_id,
                "part_size": part_size,
                "part_count": part_count,
                "status": asset.status,
                "part_urls": [],
            }
            if upload_id:
                short["part_urls"] = [
                    {
                        "part_number": part_number,
                        "url": service.presign_part_upload(key, upload_id, part_number),
                    }
                    for part_number in range(1, part_count + 1)
                ]
            return Response(short, status=status.HTTP_201_CREATED)

        upload_url = service.presign_upload(key, mime_type)
        return Response(
            {
                "id": str(asset.uuid),
                "key": key,
                "upload_url": upload_url,
                "status": asset.status,
            },
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["post"], url_path="parts", url_name="parts")
    def presign_parts(self, request, pk=None):
        """Re-presign multipart part URLs (expired URLs, or resuming an upload)."""
        asset = VideoAsset.objects.get(uuid=pk)
        teacher = get_teacher(request.user)
        if not teacher or asset.owner_id != teacher.id:
            raise PermissionDenied("You can only manage your own uploads.")

        upload_id = request.data.get("upload_id")
        if not upload_id:
            raise ValidationError({"upload_id": "This field is required."})

        part_numbers = request.data.get("part_numbers")
        if part_numbers:
            try:
                numbers = [int(number) for number in part_numbers]
            except (TypeError, ValueError):
                raise ValidationError({"part_numbers": "Provide a list of part numbers."})
        else:
            part_size, part_count = R2MediaService.plan_parts(asset.size_bytes or 0)
            numbers = list(range(1, part_count + 1))

        service = R2MediaService()
        return Response(
            {
                "id": str(asset.uuid),
                "upload_id": upload_id,
                "part_urls": [
                    {
                        "part_number": number,
                        "url": service.presign_part_upload(
                            asset.r2_key, upload_id, number
                        ),
                    }
                    for number in numbers
                ],
            }
        )

    @action(detail=True, methods=["post"], url_path="complete", url_name="complete")
    def complete_upload(self, request, pk=None):
        asset = VideoAsset.objects.get(uuid=pk)
        teacher = get_teacher(request.user)
        if not teacher or asset.owner_id != teacher.id:
            raise PermissionDenied("You can only complete your own uploads.")

        service = R2MediaService()
        upload_id = request.data.get("upload_id")
        parts = request.data.get("parts") or []
        try:
            if upload_id and parts:
                service.complete_multipart_upload(asset.r2_key, upload_id, parts)

            head = service.head_object(asset.r2_key)
        except Exception:
            asset.status = VideoAsset.Status.FAILED
            asset.save(update_fields=["status"])
            logger.exception(
                "multipart complete failed asset=%s key=%s", asset.uuid, asset.r2_key
            )
            raise ValidationError(
                {"detail": "Could not finalize the upload. Please retry."}
            )

        if head and int(head.get("ContentLength", 0) or 0) and int(head["ContentLength"]) != int(asset.size_bytes or 0):
            logger.warning(
                "upload size mismatch asset=%s expected=%s actual=%s",
                asset.uuid,
                asset.size_bytes,
                head.get("ContentLength"),
            )
            raise ValidationError({"size_bytes": "Uploaded object size does not match the expected bytes."})

        asset.status = asset.Status.READY
        asset.save(update_fields=["status"])
        return Response(
            {
                "id": str(asset.uuid),
                "status": asset.status,
                "url": service.presign_download(asset.r2_key),
            }
        )

    @action(detail=True, methods=["get"], url_path="playback", url_name="playback")
    def playback(self, request, pk=None):
        asset = VideoAsset.objects.get(uuid=pk)
        if not self._can_playback(request.user, asset):
            raise PermissionDenied("You do not have access to this video.")

        service = R2MediaService()
        playback_url = service.presign_download(asset.r2_key)
        if not playback_url:
            raise ValidationError({"detail": "No playback URL available for this video."})
        return Response({"id": str(asset.uuid), "url": playback_url, "expires_in": 1800})
