from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class ReportCreate(BaseModel):
    category: str = Field(..., description="Overflowing Bin, Illegal Dumping, Missing Dustbin, Damaged Facility")
    description: str = Field(..., min_length=5)
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    address: Optional[str] = None
    image_url: Optional[str] = None


class ReportStatusUpdate(BaseModel):
    status: str = Field(..., description="Open, In Progress, Resolved")
    admin_notes: Optional[str] = None


class ReportOut(BaseModel):
    id: str
    user_id: str
    user_name: Optional[str] = None
    user_email: Optional[str] = None
    category: str
    description: str
    latitude: float
    longitude: float
    address: Optional[str] = None
    image_url: Optional[str] = None
    status: str
    admin_notes: Optional[str] = None
    resolved_by_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
