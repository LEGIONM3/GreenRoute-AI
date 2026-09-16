from sqlalchemy import Column, String, Boolean, ForeignKey, Text, Float, Integer, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import TimestampMixin, SoftDeleteMixin


class TenantMixin:
    """Mixin for multi-tenant isolation across all entity tables."""
    tenant_id = Column(String(36), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=True, index=True)


class Tenant(Base, SoftDeleteMixin):
    """
    Enterprise Tenant entity representing a City, Municipal Corporation, 
    State Urban Development Authority, or NGO network.
    """
    __tablename__ = "tenants"

    name = Column(String(200), nullable=False, index=True)
    slug = Column(String(100), unique=True, nullable=False, index=True)
    domain = Column(String(255), unique=True, nullable=True, index=True)
    tier = Column(String(50), default="enterprise", nullable=False)  # starter, professional, enterprise
    settings_json = Column(JSON, default=dict, nullable=False)
    
    # Regional Hierarchy
    regions = relationship("Region", back_populates="tenant", cascade="all, delete-orphan")
    users = relationship("User", back_populates="tenant")
    locations = relationship("Location", back_populates="tenant")
    reports = relationship("Report", back_populates="tenant")


class Region(Base, TimestampMixin):
    """Administrative Region / District under a Tenant (e.g., Greater Bengaluru Area)."""
    __tablename__ = "regions"

    tenant_id = Column(String(36), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(150), nullable=False)
    code = Column(String(50), nullable=False, index=True)
    
    tenant = relationship("Tenant", back_populates="regions")
    zones = relationship("Zone", back_populates="region", cascade="all, delete-orphan")


class Zone(Base, TimestampMixin):
    """Operational Municipal Zone (e.g., East Zone, South Zone)."""
    __tablename__ = "zones"

    region_id = Column(String(36), ForeignKey("regions.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(150), nullable=False)
    code = Column(String(50), nullable=False, index=True)
    headquarters_address = Column(String(255), nullable=True)

    region = relationship("Region", back_populates="zones")
    wards = relationship("Ward", back_populates="zone", cascade="all, delete-orphan")


class Ward(Base, TimestampMixin):
    """Electoral / Sanitation Ward with spatial boundary polygon."""
    __tablename__ = "wards"

    zone_id = Column(String(36), ForeignKey("zones.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(150), nullable=False)
    ward_number = Column(Integer, nullable=False, index=True)
    officer_name = Column(String(150), nullable=True)
    officer_contact = Column(String(50), nullable=True)
    boundary_geojson = Column(Text, nullable=True)  # Polygon geojson for spatial geofencing
    center_lat = Column(Float, nullable=True)
    center_lon = Column(Float, nullable=True)

    zone = relationship("Zone", back_populates="wards")
    locations = relationship("Location", back_populates="ward")
    reports = relationship("Report", back_populates="ward")
