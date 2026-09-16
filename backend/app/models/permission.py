from sqlalchemy import Column, String
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import TimestampMixin


class Permission(Base, TimestampMixin):
    __tablename__ = "permissions"

    code = Column(String(100), unique=True, index=True, nullable=False)  # e.g., location.view, location.create
    name = Column(String(100), nullable=False)
    category = Column(String(50), nullable=False, index=True)  # locations, reports, policies, knowledge, users, system
    description = Column(String(255), nullable=True)

    roles = relationship("Role", secondary="role_permissions", back_populates="permissions")
