from datetime import datetime
from sqlalchemy import Column, String, Float, ForeignKey, Text, DateTime, Boolean
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import TimestampMixin
from app.models.tenant import TenantMixin


class Report(Base, TimestampMixin, TenantMixin):
    __tablename__ = "reports"

    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    category = Column(String(100), nullable=False, index=True)  # "Overflowing Bin", "Illegal Dumping", "Missing Dustbin", "Damaged Facility"
    description = Column(Text, nullable=False)
    
    # Location data
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    address = Column(String(255), nullable=True)
    
    image_url = Column(String(500), nullable=True)
    # Municipal Workflow Status: Open -> Assigned -> In Progress -> Inspected -> Resolved -> Closed (Alternate: Rejected, Escalated)
    status = Column(String(50), default="Open", nullable=False, index=True)
    priority = Column(String(20), default="Medium", nullable=False, index=True)  # Low, Medium, High, Critical
    
    # SLA Management
    sla_deadline = Column(DateTime, nullable=True)
    sla_breached = Column(Boolean, default=False, nullable=False, index=True)
    
    # Lifecycle Timestamps
    assigned_at = Column(DateTime, nullable=True)
    inspected_at = Column(DateTime, nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    closed_at = Column(DateTime, nullable=True)

    admin_notes = Column(Text, nullable=True)
    assigned_to_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    resolved_by_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    municipality_id = Column(String(36), ForeignKey("municipalities.id"), nullable=True)
    ward_id = Column(String(36), ForeignKey("wards.id"), nullable=True)

    tenant = relationship("Tenant", back_populates="reports")
    ward = relationship("Ward", back_populates="reports")
    user = relationship("User", foreign_keys=[user_id], back_populates="reports")
    assigned_to = relationship("User", foreign_keys=[assigned_to_id])
    resolved_by = relationship("User", foreign_keys=[resolved_by_id])
    municipality = relationship("Municipality", back_populates="reports")
