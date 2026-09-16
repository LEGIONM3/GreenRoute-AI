from sqlalchemy import Column, String, ForeignKey
from app.core.database import Base
from app.models.base import TimestampMixin


class UserRole(Base, TimestampMixin):
    __tablename__ = "user_roles"

    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    role_id = Column(String(36), ForeignKey("roles.id", ondelete="CASCADE"), nullable=False, index=True)
