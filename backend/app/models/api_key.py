import json
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import TimestampMixin
from app.models.tenant import TenantMixin


class ApiKey(Base, TimestampMixin, TenantMixin):
    """Scoped B2B API keys for enterprise municipal integrations."""
    __tablename__ = "api_keys"

    name = Column(String(100), nullable=False)
    prefix = Column(String(16), nullable=False, index=True)  # e.g. "wc_live_..."
    key_hash = Column(String(255), nullable=False, unique=True, index=True)
    scopes_raw = Column(Text, default="[]", nullable=False)  # JSON array of permission strings
    is_active = Column(Boolean, default=True, nullable=False)
    expires_at = Column(DateTime, nullable=True)
    last_used_at = Column(DateTime, nullable=True)
    created_by_id = Column(String(36), ForeignKey("users.id"), nullable=False)

    @property
    def scopes(self):
        try:
            return json.loads(self.scopes_raw)
        except Exception:
            return []

    @scopes.setter
    def scopes(self, value):
        self.scopes_raw = json.dumps(value or [])


class UserMfa(Base, TimestampMixin):
    """TOTP multi-factor authentication secret storage for users."""
    __tablename__ = "user_mfa"

    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    secret_key = Column(String(64), nullable=False)  # Base32 TOTP secret
    is_enabled = Column(Boolean, default=False, nullable=False)
    backup_codes_hash = Column(Text, default="[]", nullable=False)  # JSON array of bcrypt hashes
    last_verified_at = Column(DateTime, nullable=True)
