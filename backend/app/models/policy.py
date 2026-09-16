from sqlalchemy import Column, String, Text, Date, Boolean
from app.core.database import Base
from app.models.base import TimestampMixin


class Policy(Base, TimestampMixin):
    __tablename__ = "policies"

    title = Column(String(255), nullable=False, index=True)
    authority = Column(String(150), nullable=False)  # "MoEFCC", "CPCB", "State Pollution Control Board"
    category = Column(String(100), nullable=False, index=True)  # "Solid Waste", "E-Waste", "Plastic Waste", "Biomedical Waste", "Hazardous Waste"
    document_number = Column(String(100), nullable=True)
    effective_date = Column(Date, nullable=True)
    summary = Column(Text, nullable=False)
    full_text = Column(Text, nullable=False)
    file_url = Column(String(500), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
