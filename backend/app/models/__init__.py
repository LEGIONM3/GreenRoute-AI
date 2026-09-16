from app.core.database import Base
from app.models.base import TimestampMixin, SoftDeleteMixin
from app.models.municipality import Municipality
from app.models.role import Role
from app.models.permission import Permission
from app.models.role_permission import RolePermission
from app.models.user_role import UserRole
from app.models.user import User
from app.models.user_session import UserSession
from app.models.token_models import PasswordResetToken, EmailVerificationToken
from app.models.audit_log import AuditLog
from app.models.location_category import LocationCategory
from app.models.location import Location
from app.models.report import Report
from app.models.policy import Policy
from app.models.article import KnowledgeArticle
from app.models.waste_item import WasteItem
from app.models.rag import Document, DocumentChunk, ChatSession, ChatMessage

from app.models.tenant import Tenant, Region, Zone, Ward, TenantMixin
from app.models.iot_bin import SmartBin, BinTelemetry
from app.models.api_key import ApiKey, UserMfa

__all__ = [
    "Base",
    "TimestampMixin",
    "SoftDeleteMixin",
    "TenantMixin",
    "Tenant",
    "Region",
    "Zone",
    "Ward",
    "SmartBin",
    "BinTelemetry",
    "ApiKey",
    "UserMfa",
    "Municipality",
    "Role",
    "Permission",
    "RolePermission",
    "UserRole",
    "User",
    "UserSession",
    "PasswordResetToken",
    "EmailVerificationToken",
    "AuditLog",
    "LocationCategory",
    "Location",
    "Report",
    "Policy",
    "KnowledgeArticle",
    "WasteItem",
    "Document",
    "DocumentChunk",
    "ChatSession",
    "ChatMessage",
]
