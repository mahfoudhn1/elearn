from core.views import UUIDLookupMixin
# groups/views.py
from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from groups.models import Video
from groups.models import Group  
from groups.serializers import VideoSerializer
import boto3, uuid, os
from django.conf import settings

session = boto3.session.Session()
s3_client = session.client(
    "s3",
    endpoint_url="https://1594f12fc92877aea30fee55b5ba6001.r2.cloudflarestorage.com",
    aws_access_key_id=settings.R2_ACCESS_KEY_ID,
    aws_secret_access_key=settings.R2_SECRET_ACCESS_KEY,
    region_name="auto",
)

BUCKET = "riffaa"


class IsTeacher(permissions.BasePermission):
    """Allow only teachers to upload videos"""

    def has_permission(self, request, view):
        return hasattr(request.user, "teacher")  # ✅ only users with teacher profile


class VideoViewSet(UUIDLookupMixin, viewsets.ModelViewSet):
    queryset = Video.objects.all()
    serializer_class = VideoSerializer
    permission_classes = [permissions.IsAuthenticated, IsTeacher]

    def get_permissions(self):
        if self.action == "by_group":
            return [permissions.IsAuthenticated()]
        return super().get_permissions()

    @action(detail=False, methods=["post"], url_path="start")
    def start_upload(self, request):
        """Initialize multipart upload and create a Video entry"""
        teacher = request.user.teacher
        title = request.data.get("title", "Untitled Video")
        file_name = request.data.get("file_name")

        group_id = request.data.get("groupId")
        print(group_id)
        if not group_id:
            return Response({"error": "groupId is required"}, status=400)

        group = get_object_or_404(Group, uuid=group_id)

        # generate unique object key
        unique_name = f"{uuid.uuid4()}-{file_name}"

        # start multipart upload
        resp = s3_client.create_multipart_upload(Bucket=BUCKET, Key=unique_name)

        video = Video.objects.create(
            teacher=teacher,
            group=group,
            title=title,
            r2_object_key=unique_name,
            upload_id=resp["UploadId"],
            upload_status=Video.UploadStatus.PENDING,
        )

        return Response({
            "uploadId": resp["UploadId"],
            "object_key": unique_name,
            "video_id": str(video.uuid),
        })

    @action(detail=False, methods=["post"], url_path="presign")
    def presign(self, request):
        """Generate presigned URL for one part"""
        object_key = request.data["object_key"]
        upload_id = request.data["uploadId"]
        part_number = int(request.data["partNumber"])

        url = s3_client.generate_presigned_url(
            "upload_part",
            Params={
                "Bucket": BUCKET,
                "Key": object_key,
                "UploadId": upload_id,
                "PartNumber": part_number,
            },
            ExpiresIn=3600,
        )
        return Response({"url": url})

    @action(detail=False, methods=["post"], url_path="complete")
    def complete(self, request):
        """Complete multipart upload & update Video entry"""
        object_key = request.data["object_key"]
        upload_id = request.data["uploadId"]
        parts = request.data["parts"]

        result = s3_client.complete_multipart_upload(
            Bucket=BUCKET,
            Key=object_key,
            UploadId=upload_id,
            MultipartUpload={"Parts": parts},
        )

        # update video status
        video = get_object_or_404(Video, r2_object_key=object_key, upload_id=upload_id)
        video.upload_status = Video.UploadStatus.COMPLETED
        video.save()

        return Response({
            "url": result["Location"],
            "video_id": str(video.uuid),
            "status": "completed"
        })

    @action(detail=False, methods=["get"], url_path="by-group/(?P<group_id>[^/.]+)")
    def by_group(self, request, group_id=None):
        """Retrieve videos for a specific group and generate signed URLs"""
        group = get_object_or_404(Group, uuid=group_id)
        user = request.user
        is_teacher = group.admin.user_id == user.id
        is_student = group.students.filter(user=user).exists()
        if not (is_teacher or is_student):
            raise PermissionDenied("You are not a member of this group.")

        videos = Video.objects.filter(group=group, upload_status=Video.UploadStatus.COMPLETED)

        result = []
        for video in videos:
            signed_url = s3_client.generate_presigned_url(
                "get_object",
                Params={"Bucket": BUCKET, "Key": video.r2_object_key},
                ExpiresIn=3600  # 1 hour access
            )
            result.append({
                "id": str(video.uuid),
                "title": video.title,
                "signed_url": signed_url,
                "created_at": video.created_at,
            })

        return Response(result)
