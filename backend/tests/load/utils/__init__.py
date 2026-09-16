"""
Load Testing Utilities & Helpers
Enterprise Municipal SaaS Platform - Phase 11
"""

import json
from typing import Dict, Any, Optional

DEFAULT_TENANT_ID = "default"
ADMIN_EMAIL = "admin@wastecare.gov"
ADMIN_PASSWORD = "Admin@123456"
CITIZEN_EMAIL = "citizen@wastecare.gov"
CITIZEN_PASSWORD = "Citizen@123456"

# Representative coordinates for Bangalore municipal wards
MUNICIPAL_COORDS = [
    {"name": "Central Ward", "lat": 12.9716, "lon": 77.5946},
    {"name": "Indiranagar", "lat": 12.9784, "lon": 77.6408},
    {"name": "Koramangala", "lat": 12.9352, "lon": 77.6245},
    {"name": "Whitefield", "lat": 12.9698, "lon": 77.7499},
    {"name": "Malleshwaram", "lat": 13.0031, "lon": 77.5643},
    {"name": "Jayanagar", "lat": 12.9250, "lon": 77.5838}
]

# Municipal Ward Polygons for GIS bounding tests
CENTRAL_WARD_POLYGON = [
    [12.9650, 77.5850],
    [12.9800, 77.5850],
    [12.9800, 77.6050],
    [12.9650, 77.6050],
    [12.9650, 77.5850]
]


def get_auth_headers(token: Optional[str], tenant_id: str = DEFAULT_TENANT_ID) -> Dict[str, str]:
    headers = {
        "Content-Type": "application/json",
        "X-Tenant-ID": tenant_id
    }
    if token:
        headers["Authorization"] = f"Bearer {token}"
    return headers
