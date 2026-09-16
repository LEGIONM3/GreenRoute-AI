from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional


class MunicipalWorkflowEngine:
    """
    Municipal Sanitation Complaint State Machine & SLA Management Engine.
    Validates lifecycle transitions and tracks SLA breach escalation rules.
    """

    ALLOWED_TRANSITIONS: Dict[str, List[str]] = {
        "Open": ["Assigned", "In Progress", "Rejected"],
        "Assigned": ["In Progress", "Escalated", "Rejected"],
        "In Progress": ["Inspected", "Resolved", "Escalated"],
        "Inspected": ["Resolved", "In Progress"],
        "Escalated": ["In Progress", "Resolved"],
        "Resolved": ["Closed", "In Progress"],
        "Closed": [],
        "Rejected": [],
    }

    # SLA Target Deadlines in Hours based on Priority
    SLA_PRIORITY_HOURS: Dict[str, int] = {
        "Critical": 4,
        "High": 12,
        "Medium": 24,
        "Low": 48,
    }

    @classmethod
    def can_transition(cls, current_status: str, next_status: str) -> bool:
        """Verifies if the requested state transition is legally permitted."""
        allowed = cls.ALLOWED_TRANSITIONS.get(current_status, [])
        return next_status in allowed

    @classmethod
    def calculate_sla_deadline(cls, priority: str = "Medium", created_at: Optional[datetime] = None) -> datetime:
        """Calculates SLA deadline based on grievance urgency."""
        base_time = created_at or datetime.utcnow()
        hours = cls.SLA_PRIORITY_HOURS.get(priority, 24)
        return base_time + timedelta(hours=hours)

    @classmethod
    def evaluate_sla_breach(cls, sla_deadline: Optional[datetime], current_status: str) -> bool:
        """Returns True if the complaint is overdue and not yet resolved/closed."""
        if not sla_deadline:
            return False
        if current_status in ("Resolved", "Closed", "Rejected"):
            return False
        return datetime.utcnow() > sla_deadline

    @classmethod
    def determine_priority_by_category(cls, category: str) -> str:
        """Maps civic issue category to operational urgency level."""
        cat_lower = category.lower()
        if "hazardous" in cat_lower or "chemical" in cat_lower or "bio-medical" in cat_lower:
            return "Critical"
        if "overflowing" in cat_lower or "dumping" in cat_lower:
            return "High"
        if "damaged" in cat_lower or "missing" in cat_lower:
            return "Medium"
        return "Low"


workflow_engine = MunicipalWorkflowEngine()
