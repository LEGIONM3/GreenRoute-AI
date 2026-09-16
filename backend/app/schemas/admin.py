from typing import List, Dict, Any
from pydantic import BaseModel
from app.schemas.report import ReportOut


class AdminMetricsOut(BaseModel):
    total_users: int
    total_locations: int
    total_reports: int
    open_reports: int
    in_progress_reports: int
    resolved_reports: int
    total_policies: int
    total_articles: int
    resolution_rate_pct: float
    reports_by_category: Dict[str, int] = {}
    locations_by_category: Dict[str, int] = {}
    recent_reports: List[ReportOut] = []
