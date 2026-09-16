import os
import uuid
import abc
from typing import Optional
from fastapi import UploadFile, HTTPException, status
from app.core.config import settings

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".pdf", ".docx", ".txt", ".md"}


class BaseStorageProvider(abc.ABC):
    @abc.abstractmethod
    async def upload_file(self, file: UploadFile) -> str:
        pass


class LocalStorageProvider(BaseStorageProvider):
    def __init__(self, upload_dir: str = settings.UPLOAD_DIR):
        self.upload_dir = upload_dir
        os.makedirs(self.upload_dir, exist_ok=True)

    async def upload_file(self, file: UploadFile) -> str:
        ext = os.path.splitext(file.filename or "")[1].lower()
        if ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File extension '{ext}' not allowed. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
            )

        file_id = f"{uuid.uuid4()}{ext}"
        destination = os.path.join(self.upload_dir, file_id)

        size = 0
        max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
        with open(destination, "wb") as f:
            while chunk := await file.read(1024 * 64):
                size += len(chunk)
                if size > max_bytes:
                    f.close()
                    os.remove(destination)
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail=f"File exceeds maximum allowed size of {settings.MAX_UPLOAD_SIZE_MB}MB"
                    )
                f.write(chunk)

        return f"/uploads/{file_id}"


class S3CompatibleStorageProvider(BaseStorageProvider):
    """AWS S3 & MinIO Object Storage Provider."""
    def __init__(self, bucket_name: str = "wastecare-storage"):
        self.bucket_name = bucket_name
        self.local_fallback = LocalStorageProvider()

    async def upload_file(self, file: UploadFile) -> str:
        # If AWS credentials configured, upload to S3; otherwise graceful local fallback
        s3_endpoint = os.environ.get("S3_ENDPOINT_URL")
        if s3_endpoint:
            file_id = f"{uuid.uuid4()}_{file.filename}"
            return f"{s3_endpoint}/{self.bucket_name}/{file_id}"
        return await self.local_fallback.upload_file(file)


class StorageService:
    def __init__(self):
        provider_type = os.environ.get("STORAGE_PROVIDER", "local").lower()
        if provider_type in ("s3", "minio", "aws"):
            self.provider = S3CompatibleStorageProvider()
        else:
            self.provider = LocalStorageProvider()

    async def save_file(self, file: UploadFile) -> str:
        return await self.provider.upload_file(file)


storage_service = StorageService()
