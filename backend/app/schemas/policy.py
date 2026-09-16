from datetime import datetime, date
from typing import Optional
from pydantic import BaseModel


class PolicyBase(BaseModel):
    title: str
    authority: str
    category: str  # "Solid Waste", "E-Waste", "Plastic Waste", "Biomedical Waste", "Hazardous Waste"
    document_number: Optional[str] = None
    effective_date: Optional[date] = None
    summary: str
    full_text: str
    file_url: Optional[str] = None
    is_active: bool = True


class PolicyCreate(PolicyBase):
    pass


class PolicyOut(PolicyBase):
    id: str
    created_at: datetime

    class Config:
        from_attributes = True
