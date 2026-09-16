import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Boolean
from app.core.database import Base


def generate_uuid() -> str:
    return str(uuid.uuid4())


class TimestampMixin:
    id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class SoftDeleteMixin(TimestampMixin):
    is_active = Column(Boolean, default=True, nullable=False)
    deleted_at = Column(DateTime, nullable=True)

    def soft_delete(self):
        self.is_active = False
        self.deleted_at = datetime.utcnow()
