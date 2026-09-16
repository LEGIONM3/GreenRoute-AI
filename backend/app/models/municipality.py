from sqlalchemy import Column, String, Text
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import TimestampMixin


class Municipality(Base, TimestampMixin):
    __tablename__ = "municipalities"

    name = Column(String(150), unique=True, nullable=False, index=True)
    code = Column(String(20), unique=True, nullable=False, index=True)
    state = Column(String(100), nullable=False)
    country = Column(String(100), default="India", nullable=False)
    contact_email = Column(String(255), nullable=True)
    contact_phone = Column(String(50), nullable=True)
    boundary_geojson = Column(Text, nullable=True)

    users = relationship("User", back_populates="municipality")
    locations = relationship("Location", back_populates="municipality")
    reports = relationship("Report", back_populates="municipality")
