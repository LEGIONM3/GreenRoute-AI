from datetime import datetime
from sqlalchemy import Column, String, Boolean, ForeignKey, DateTime, Integer
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import TimestampMixin
from app.models.tenant import TenantMixin


class User(Base, TimestampMixin, TenantMixin):
    __tablename__ = "users"

    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(100), nullable=False)
    phone = Column(String(50), nullable=True)
    avatar_url = Column(String(500), nullable=True)
    status = Column(String(20), default="Active", nullable=False)  # Active, Suspended, Pending
    last_login = Column(DateTime, nullable=True)
    email_verified = Column(Boolean, default=False, nullable=False)
    phone_verified = Column(Boolean, default=False, nullable=False)
    environmental_score = Column(Integer, default=0, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

    role_id = Column(String(36), ForeignKey("roles.id"), nullable=False)
    municipality_id = Column(String(36), ForeignKey("municipalities.id"), nullable=True)

    tenant = relationship("Tenant", back_populates="users")
    role = relationship("Role", back_populates="users")
    roles = relationship("Role", secondary="user_roles")
    municipality = relationship("Municipality", back_populates="users")
    sessions = relationship("UserSession", back_populates="user", cascade="all, delete-orphan")
    password_reset_tokens = relationship("PasswordResetToken", back_populates="user", cascade="all, delete-orphan")
    email_verification_tokens = relationship("EmailVerificationToken", back_populates="user", cascade="all, delete-orphan")
    reports = relationship("Report", back_populates="user", foreign_keys="Report.user_id")
    chat_sessions = relationship("ChatSession", back_populates="user", cascade="all, delete-orphan")

    @property
    def password_hash(self) -> str:
        return self.hashed_password

    @password_hash.setter
    def password_hash(self, value: str):
        self.hashed_password = value

    def get_all_permissions(self) -> set:
        perms = set()
        # SuperAdmin has all permissions implicitly
        if self.role and self.role.name == "SuperAdmin":
            return {"*"}
        
        all_roles = [self.role] if self.role else []
        if self.roles:
            all_roles.extend(self.roles)

        for r in all_roles:
            if r and r.permissions:
                for p in r.permissions:
                    perms.add(p.code)
        return perms

    def has_permission(self, permission_code: str) -> bool:
        if self.role and self.role.name == "SuperAdmin":
            return True
        perms = self.get_all_permissions()
        if "*" in perms:
            return True
        return permission_code in perms
