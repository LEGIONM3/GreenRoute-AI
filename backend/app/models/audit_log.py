from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import TimestampMixin


class AuditLog(Base, TimestampMixin):
    __tablename__ = "audit_logs"

    user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    action = Column(String(100), nullable=False, index=True)  # LOGIN, LOGOUT, LOGOUT_ALL, ROLE_ASSIGN, PERMISSION_UPDATE, LOCATION_CREATE, etc.
    resource = Column(String(100), nullable=False, index=True)  # auth, user, role, location, policy, knowledge, report, system
    resource_id = Column(String(100), nullable=True)
    details = Column(Text, nullable=True)  # JSON string or description
    ip_address = Column(String(50), nullable=True)

    user = relationship("User", foreign_keys=[user_id])
