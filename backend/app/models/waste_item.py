import json
from sqlalchemy import Column, String, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import TimestampMixin


class WasteItem(Base, TimestampMixin):
    __tablename__ = "waste_items"

    name = Column(String(100), unique=True, index=True, nullable=False)
    aliases_raw = Column(Text, default="[]", nullable=False)  # synonyms e.g. ["cell", "AA battery", "dry cell"]
    category = Column(String(50), nullable=False)  # "E-Waste", "Dry Waste", "Wet Waste", "Hazardous", "Biomedical"
    segregation_bin = Column(String(50), nullable=False)  # "Dry (Blue)", "Wet (Green)", "E-Waste (Grey)", "Hazardous (Red)", "Sanitary (Yellow)"
    disposal_method = Column(Text, nullable=False)
    recycling_guidance = Column(Text, nullable=False)
    safety_precautions = Column(Text, nullable=False)
    target_facility_code = Column(String(50), nullable=False)  # "recycling", "e_waste", "hazardous", "dustbin"

    @property
    def aliases(self):
        try:
            return json.loads(self.aliases_raw)
        except Exception:
            return []

    @aliases.setter
    def aliases(self, value):
        self.aliases_raw = json.dumps(value or [])
