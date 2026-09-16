from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class LocationCategoryBase(BaseModel):
    name: str
    code: str
    icon: Optional[str] = None
    color: Optional[str] = None
    description: Optional[str] = None


class LocationCategoryCreate(LocationCategoryBase):
    pass


class LocationCategoryOut(LocationCategoryBase):
    id: str

    class Config:
        from_attributes = True


class LocationBase(BaseModel):
    name: str
    description: Optional[str] = None
    category_id: str
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    address: str
    city: str
    postal_code: Optional[str] = None
    accepted_waste_types: List[str] = []
    operating_hours: Dict[str, str] = {}
    contact_phone: Optional[str] = None
    is_verified: bool = True


class LocationCreate(LocationBase):
    pass


class LocationUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category_id: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    address: Optional[str] = None
    city: Optional[str] = None
    postal_code: Optional[str] = None
    accepted_waste_types: Optional[List[str]] = None
    operating_hours: Optional[Dict[str, str]] = None
    contact_phone: Optional[str] = None
    is_verified: Optional[bool] = None
    is_active: Optional[bool] = None


class LocationOut(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    category_id: str
    category: Optional[LocationCategoryOut] = None
    latitude: float
    longitude: float
    address: str
    city: str
    postal_code: Optional[str] = None
    accepted_waste_types: List[str] = []
    operating_hours: Dict[str, str] = {}
    contact_phone: Optional[str] = None
    is_verified: bool
    is_active: bool
    distance_km: Optional[float] = None
    directions_url: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
