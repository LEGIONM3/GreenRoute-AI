from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel
from app.schemas.location import LocationOut


class WasteItemBase(BaseModel):
    name: str
    aliases: List[str] = []
    category: str
    segregation_bin: str  # "Dry (Blue)", "Wet (Green)", "E-Waste (Grey)", "Hazardous (Red)", "Sanitary (Yellow)"
    disposal_method: str
    recycling_guidance: str
    safety_precautions: str
    target_facility_code: str


class WasteItemCreate(WasteItemBase):
    pass


class WasteItemOut(WasteItemBase):
    id: str
    created_at: datetime

    class Config:
        from_attributes = True


class WasteSearchResponse(BaseModel):
    query: str
    matched_item: Optional[WasteItemOut] = None
    all_matching_items: List[WasteItemOut] = []
    nearest_facilities: List[LocationOut] = []
