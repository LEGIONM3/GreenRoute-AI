from datetime import datetime
from sqlalchemy import Column, String, Float, Integer, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import TimestampMixin
from app.models.tenant import TenantMixin


class SmartBin(Base, TimestampMixin, TenantMixin):
    """IoT Smart Dustbin with ultrasonic fill-level and tilt sensors."""
    __tablename__ = "smart_bins"

    bin_code = Column(String(50), unique=True, nullable=False, index=True)
    location_id = Column(String(36), ForeignKey("locations.id"), nullable=True)
    ward_id = Column(String(36), ForeignKey("wards.id"), nullable=True)
    capacity_litres = Column(Integer, default=240, nullable=False)
    sensor_hardware_id = Column(String(100), unique=True, nullable=True)
    
    # Real-time Telemetry State
    fill_level_pct = Column(Float, default=0.0, nullable=False)
    battery_pct = Column(Float, default=100.0, nullable=False)
    temperature_celsius = Column(Float, default=25.0, nullable=False)
    tilt_angle = Column(Float, default=0.0, nullable=False)
    is_overflowing = Column(Boolean, default=False, nullable=False, index=True)
    last_telemetry_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    telemetry_logs = relationship("BinTelemetry", back_populates="bin", cascade="all, delete-orphan")


class BinTelemetry(Base, TimestampMixin):
    """Historical telemetry timeseries data from IoT Bin sensors."""
    __tablename__ = "bin_telemetry"

    bin_id = Column(String(36), ForeignKey("smart_bins.id", ondelete="CASCADE"), nullable=False, index=True)
    fill_level_pct = Column(Float, nullable=False)
    battery_pct = Column(Float, nullable=False)
    temperature_celsius = Column(Float, nullable=False)
    tilt_angle = Column(Float, nullable=False)
    recorded_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    bin = relationship("SmartBin", back_populates="telemetry_logs")
