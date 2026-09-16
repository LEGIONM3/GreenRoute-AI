from sqlalchemy import Column, String, ForeignKey
from app.core.database import Base
from app.models.base import TimestampMixin


class RolePermission(Base, TimestampMixin):
    __tablename__ = "role_permissions"

    role_id = Column(String(36), ForeignKey("roles.id", ondelete="CASCADE"), nullable=False, index=True)
    permission_id = Column(String(36), ForeignKey("permissions.id", ondelete="CASCADE"), nullable=False, index=True)
