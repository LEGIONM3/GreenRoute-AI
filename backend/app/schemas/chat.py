from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class CitationItem(BaseModel):
    title: str
    source_type: str  # "Policy", "Regulation", "Recycling Guide"
    reference: str  # Section or document number
    chunk_excerpt: str
    relevance_score: float


class ChatQueryRequest(BaseModel):
    query: str = Field(..., min_length=2, max_length=1000)
    session_id: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    response_mode: Optional[str] = Field("auto", pattern="^(auto|short|normal|detailed)$")


class ChatQueryResponse(BaseModel):
    answer: str
    citations: List[CitationItem] = []
    session_id: str
    suggested_followups: List[str] = []
    confidence_score: float = 0.85
    model_used: Optional[str] = None
    related_locations: List[Dict[str, Any]] = []
    related_policies: List[Dict[str, Any]] = []


class ChatMessageOut(BaseModel):
    id: str
    sender: str
    content: str
    citations: List[CitationItem] = []
    created_at: datetime

    class Config:
        from_attributes = True


class ChatSessionOut(BaseModel):
    id: str
    title: str
    created_at: datetime
    updated_at: datetime
    messages: List[ChatMessageOut] = []

    class Config:
        from_attributes = True
