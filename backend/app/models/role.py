from sqlalchemy import Column, String
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import TimestampMixin


class Role(Base, TimestampMixin):
    __tablename__ = "roles"

    name = Column(String(50), unique=True, index=True, nullable=False)  # "Citizen", "MunicipalOperator", "ContentManager", "Admin", "SuperAdmin"
    description = Column(String(255), nullable=True)

    users = relationship("User", back_populates="role")
    permissions = relationship("Permission", secondary="role_permissions", back_populates="roles")
