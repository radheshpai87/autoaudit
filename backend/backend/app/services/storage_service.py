"""Private S3 artifact storage for inspection images."""

from __future__ import annotations

from datetime import datetime, timezone
from functools import lru_cache
from typing import Mapping

from app.config import settings


class InspectionStorageService:
    """Upload inspection artifacts to a private bucket when configured."""

    def __init__(self) -> None:
        self.bucket = settings.AWS_S3_BUCKET_NAME

    @property
    def enabled(self) -> bool:
        return bool(self.bucket)

    @lru_cache(maxsize=1)
    def _client(self):
        import boto3

        options = {}
        if settings.AWS_REGION:
            options["region_name"] = settings.AWS_REGION
        return boto3.client("s3", **options)

    def upload_artifacts(self, image_id: str, extension: str, artifacts: Mapping[str, bytes]) -> dict[str, str]:
        if not self.enabled or not artifacts:
            return {}

        suffix = extension.lower()
        if not suffix.startswith("."):
            suffix = f".{suffix}"
        content_type = {".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp"}.get(suffix, "application/octet-stream")
        date_prefix = datetime.now(timezone.utc).strftime("%Y/%m/%d")
        uploaded: dict[str, str] = {}
        client = self._client()
        for name in ("raw", "annotated", "heatmap"):
            body = artifacts.get(name)
            if not body:
                continue
            key = f"inspections/{date_prefix}/{image_id}/{name}{suffix}"
            client.put_object(
                Bucket=self.bucket,
                Key=key,
                Body=body,
                ContentType=content_type,
                ServerSideEncryption="AES256",
            )
            uploaded[name] = key
        return uploaded

    def get_presigned_url(self, key: str | None) -> str | None:
        if not key or not self.enabled:
            return None
        return self._client().generate_presigned_url(
            "get_object",
            Params={"Bucket": self.bucket, "Key": key},
            ExpiresIn=max(60, min(int(settings.AWS_S3_PRESIGNED_URL_TTL), 604800)),
        )


storage_service = InspectionStorageService()
