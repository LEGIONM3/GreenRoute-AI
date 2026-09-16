import json
from datetime import datetime
from typing import Optional, Union, Dict, Any, Tuple, List
from sqlalchemy.orm import Session
from app.models.audit_log import AuditLog


class AuditService:
    @staticmethod
    def log_activity(
        db: Session,
        action: str,
        resource: Optional[str] = None,
        user_id: Optional[str] = None,
        resource_id: Optional[str] = None,
        details: Optional[Union[Dict[str, Any], str]] = None,
        ip_address: Optional[str] = None,
        user: Optional[Any] = None,
        target_type: Optional[str] = None,
        target_id: Optional[str] = None
    ) -> AuditLog:
        """Records an immutable audit log entry for regulatory and enterprise tracking."""
        actual_user_id = user_id or (getattr(user, "id", None) if user else None)
        actual_resource = resource or target_type or "system"
        actual_resource_id = resource_id or target_id

        if isinstance(details, dict):
            details_str = json.dumps(details)
        else:
            details_str = str(details) if details is not None else None

        log_entry = AuditLog(
            user_id=actual_user_id,
            action=action,
            resource=actual_resource,
            resource_id=actual_resource_id,
            details=details_str,
            ip_address=ip_address
        )
        db.add(log_entry)
        db.commit()
        db.refresh(log_entry)
        return log_entry

    @staticmethod
    def get_audit_logs(
        db: Session,
        skip: int = 0,
        limit: int = 50,
        user_id: Optional[str] = None,
        action: Optional[str] = None,
        resource: Optional[str] = None
    ) -> Tuple[List[AuditLog], int]:
        query = db.query(AuditLog)
        if user_id:
            query = query.filter(AuditLog.user_id == user_id)
        if action:
            query = query.filter(AuditLog.action.ilike(f"%{action}%"))
        if resource:
            query = query.filter(AuditLog.resource == resource)
        
        total = query.count()
        items = query.order_by(AuditLog.created_at.desc()).offset(skip).limit(limit).all()
        return items, total


audit_service = AuditService()
log_activity = audit_service.log_activity
get_audit_logs = audit_service.get_audit_logs
