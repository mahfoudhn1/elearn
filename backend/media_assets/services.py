import logging
import uuid

import boto3
from botocore.config import Config
from botocore.exceptions import BotoCoreError, ClientError
from django.conf import settings

logger = logging.getLogger("media_assets.r2")


class R2MediaService:
    ALLOWED_MIME_TYPES = {
        "video/mp4",
        "video/webm",
        "video/quicktime",
        "video/x-matroska",
    }
    # Files above this use multipart; smaller ones get a single presigned PUT.
    MULTIPART_THRESHOLD_BYTES = 100 * 1024 * 1024
    # S3/R2 requires every part except the last to be at least 5 MiB.
    MIN_PART_SIZE_BYTES = 8 * 1024 * 1024
    # Keep the presigned URL list bounded for very large uploads.
    MAX_PARTS = 1000

    @classmethod
    def plan_parts(cls, size_bytes):
        """Return ``(part_size, part_count)`` for a multipart upload.

        The part size grows with the file so the number of presigned URLs stays
        within ``MAX_PARTS`` regardless of how large the video is.
        """
        import math

        size = max(int(size_bytes), 1)
        part_size = max(cls.MIN_PART_SIZE_BYTES, math.ceil(size / cls.MAX_PARTS))
        part_count = max(math.ceil(size / part_size), 1)
        return part_size, part_count

    def __init__(self):
        self.endpoint_url = getattr(settings, "R2_ENDPOINT_URL", "")
        self.bucket_name = getattr(settings, "R2_BUCKET_NAME", "")
        self.public_base_url = getattr(settings, "R2_PUBLIC_BASE_URL", "")
        self.access_key_id = getattr(settings, "R2_ACCESS_KEY_ID", "")
        self.secret_access_key = getattr(settings, "R2_SECRET_ACCESS_KEY", "")

    def _log_r2_error(self, operation, error, key=None):
        """Surface R2 failures for monitoring without leaking credentials."""
        logger.error(
            "R2 %s failed bucket=%s key=%s error=%s",
            operation,
            self.bucket_name,
            key,
            error,
            exc_info=True,
        )

    def _call(self, operation, key, func, *args, **kwargs):
        try:
            return func(*args, **kwargs)
        except (BotoCoreError, ClientError) as error:
            self._log_r2_error(operation, error, key)
            raise

    @property
    def client(self):
        if not self.endpoint_url or not self.bucket_name:
            return None
        return boto3.client(
            "s3",
            endpoint_url=self.endpoint_url,
            aws_access_key_id=self.access_key_id,
            aws_secret_access_key=self.secret_access_key,
            region_name="auto",
            config=Config(signature_version="s3v4"),
        )

    def build_key(self, owner_id, original_filename):
        safe_name = (original_filename or "upload").replace(" ", "_")
        return f"videos/{owner_id}/{uuid.uuid4()}-{safe_name}"

    def _generate_presigned_url(self, method_name, params, expires_in=600):
        if not self.client:
            return None
        return self.client.generate_presigned_url(
            ClientMethod=method_name,
            Params=params,
            ExpiresIn=expires_in,
        )

    def presign_upload(self, key, content_type, expires_in=600):
        return self._generate_presigned_url(
            "put_object",
            {
                "Bucket": self.bucket_name,
                "Key": key,
                "ContentType": content_type or "application/octet-stream",
            },
            expires_in,
        )

    def create_multipart_upload(self, key, content_type):
        if not self.client:
            return None
        return self._call(
            "create_multipart_upload",
            key,
            self.client.create_multipart_upload,
            Bucket=self.bucket_name,
            Key=key,
            ContentType=content_type or "application/octet-stream",
        )

    def presign_part_upload(self, key, upload_id, part_number, expires_in=3600):
        return self._generate_presigned_url(
            "upload_part",
            {
                "Bucket": self.bucket_name,
                "Key": key,
                "UploadId": upload_id,
                "PartNumber": part_number,
            },
            expires_in,
        )

    def complete_multipart_upload(self, key, upload_id, parts):
        if not self.client:
            return None
        return self._call(
            "complete_multipart_upload",
            key,
            self.client.complete_multipart_upload,
            Bucket=self.bucket_name,
            Key=key,
            UploadId=upload_id,
            MultipartUpload={"Parts": parts},
        )

    def presign_download(self, key, expires_in=1800):
        return self._generate_presigned_url(
            "get_object",
            {"Bucket": self.bucket_name, "Key": key},
            expires_in,
        )

    def delete_object(self, key):
        if not self.client:
            return False
        self._call("delete_object", key, self.client.delete_object, Bucket=self.bucket_name, Key=key)
        return True

    def head_object(self, key):
        if not self.client:
            return None
        return self._call("head_object", key, self.client.head_object, Bucket=self.bucket_name, Key=key)

    def get_public_url(self, key):
        if not key:
            return ""
        if self.public_base_url:
            return f"{self.public_base_url.rstrip('/')}/{key.lstrip('/')}"
        return f"{self.endpoint_url.rstrip('/')}/{self.bucket_name}/{key.lstrip('/')}"

    def complete_upload(self, asset, etag=None):
        asset.status = asset.Status.READY
        if etag:
            asset.r2_key = asset.r2_key
        asset.save(update_fields=["status"])
        return asset
