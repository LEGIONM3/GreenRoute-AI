from sqlalchemy import Column, String
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import TimestampMixin


class LocationCategory(Base, TimestampMixin):
    __tablename__ = "location_categories"

    name = Column(String(100), unique=True, nullable=False)  # "Public Dustbin", "Recycling Center", etc.
    code = Column(String(50), unique=True, index=True, nullable=False)  # "dustbin", "recycling", "e_waste", "hazardous"
    icon = Column(String(50), nullable=True)  # icon name e.g. "trash-2", "recycle", "cpu", "alert-triangle"
    color = Column(String(20), nullable=True)  # hex or badge color e.g. "#10B981", "#3B82F6"
    description = Column(String(255), nullable=True)

    locations = relationship("Location", back_populates="category")
