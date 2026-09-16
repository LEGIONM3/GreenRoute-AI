import json
from sqlalchemy import Column, String, Float, Boolean, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import SoftDeleteMixin
from app.models.tenant import TenantMixin


class Location(Base, SoftDeleteMixin, TenantMixin):
    __tablename__ = "locations"

    name = Column(String(150), nullable=False, index=True)
    description = Column(Text, nullable=True)
    category_id = Column(String(36), ForeignKey("location_categories.id"), nullable=False, index=True)
    
    # Coordinates for GIS mapping
    latitude = Column(Float, nullable=False, index=True)
    longitude = Column(Float, nullable=False, index=True)
    
    # Address details
    address = Column(String(255), nullable=False)
    city = Column(String(100), nullable=False, index=True)
    postal_code = Column(String(20), nullable=True)
    
    # Serialized JSON structures for types & operating hours
    accepted_waste_types_raw = Column(Text, default="[]", nullable=False)  # stored as JSON string
    operating_hours_raw = Column(Text, default="{}", nullable=False)  # stored as JSON string
    
    contact_phone = Column(String(50), nullable=True)
    is_verified = Column(Boolean, default=True, nullable=False)
    created_by_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    municipality_id = Column(String(36), ForeignKey("municipalities.id"), nullable=True)
    ward_id = Column(String(36), ForeignKey("wards.id"), nullable=True)

    tenant = relationship("Tenant", back_populates="locations")
    ward = relationship("Ward", back_populates="locations")
    category = relationship("LocationCategory", back_populates="locations")
    created_by = relationship("User", foreign_keys=[created_by_id])
    municipality = relationship("Municipality", back_populates="locations")

    @property
    def accepted_waste_types(self):
        try:
            return json.loads(self.accepted_waste_types_raw)
        except Exception:
            return []

    @accepted_waste_types.setter
    def accepted_waste_types(self, value):
        self.accepted_waste_types_raw = json.dumps(value or [])

    @property
    def operating_hours(self):
        try:
            return json.loads(self.operating_hours_raw)
        except Exception:
            return {}

    @operating_hours.setter
    def operating_hours(self, value):
        self.operating_hours_raw = json.dumps(value or {})
