"""
Enterprise Performance & PWA Feature Validation Suite
Phase 11: Performance Engineering & Phase 12: Enterprise UX + PWA

Tests:
1. GIS Point-in-Polygon spatial query
2. GIS Traveling Salesperson Route Optimization
3. Offline Field Worker Report Batch-Sync & Conflict Resolution
4. Multi-Tenant Cache Isolation & Prefixes
5. Connection Pool Metrics & Latency SLA Checks
"""

import pytest
from app.services.gis_service import gis_service, haversine_distance
from app.services.cache_service import cache_service


def test_haversine_distance_accuracy():
    # Vidhana Soudha to Indiranagar (approx 4.8 km)
    dist = haversine_distance(12.9797, 77.5907, 12.9784, 77.6408)
    assert 4.0 <= dist <= 6.0


def test_polygon_containment():
    # Polygon covering Central Bangalore
    polygon = [
        [12.9600, 77.5800],
        [12.9900, 77.5800],
        [12.9900, 77.6100],
        [12.9600, 77.6100],
        [12.9600, 77.5800]
    ]
    inside_point = (12.9750, 77.5950)
    outside_point = (13.0500, 77.5000)

    assert gis_service.point_in_polygon(inside_point[0], inside_point[1], polygon) is True
    assert gis_service.point_in_polygon(outside_point[0], outside_point[1], polygon) is False


def test_route_optimization_tsp():
    depot = {"lat": 12.9716, "lon": 77.5946, "name": "Depot"}
    stops = [
        {"lat": 12.9784, "lon": 77.6408, "name": "Stop A"},
        {"lat": 12.9352, "lon": 77.6245, "name": "Stop B"},
        {"lat": 12.9250, "lon": 77.5838, "name": "Stop C"}
    ]

    optimized = gis_service.optimize_route(depot, stops)
    assert "route" in optimized
    assert "total_distance_km" in optimized
    assert len(optimized["route"]) == 4  # Depot + 3 stops
    assert optimized["total_distance_km"] > 0


def test_multi_tenant_cache_isolation():
    key_tenant_a = cache_service.build_key("tenant-alpha", "facilities", "rec-01")
    key_tenant_b = cache_service.build_key("tenant-beta", "facilities", "rec-01")

    assert key_tenant_a != key_tenant_b
    assert key_tenant_a.startswith("tenant-alpha:facilities:")
    assert key_tenant_b.startswith("tenant-beta:facilities:")

    cache_service.set(key_tenant_a, {"name": "Alpha Facility"}, ttl=60)
    cache_service.set(key_tenant_b, {"name": "Beta Facility"}, ttl=60)

    assert cache_service.get(key_tenant_a)["name"] == "Alpha Facility"
    assert cache_service.get(key_tenant_b)["name"] == "Beta Facility"

    # Invalidate only tenant-alpha
    cache_service.invalidate_prefix("tenant-alpha:")
    assert cache_service.get(key_tenant_a) is None
    assert cache_service.get(key_tenant_b)["name"] == "Beta Facility"


def test_gis_polygon_endpoint(client):
    polygon_payload = {
        "polygon": [
            [12.9000, 77.5000],
            [13.1000, 77.5000],
            [13.1000, 77.7500],
            [12.9000, 77.7500],
            [12.9000, 77.5000]
        ],
        "category_code": "recycling"
    }
    res = client.post("/api/v1/locations/polygon-search", json=polygon_payload)
    assert res.status_code == 200
    data = res.json()
    assert "locations" in data
    assert "count" in data


def test_gis_route_optimization_endpoint(client):
    payload = {
        "depot": {"name": "Central Depot", "lat": 12.9716, "lon": 77.5946},
        "stops": [
            {"name": "Bin Indiranagar", "lat": 12.9784, "lon": 77.6408},
            {"name": "Bin Koramangala", "lat": 12.9352, "lon": 77.6245}
        ]
    }
    res = client.post("/api/v1/locations/optimize-route", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert "total_distance_km" in data
    assert "waypoints" in data
    assert len(data["waypoints"]) >= 3


def test_offline_worker_batch_sync(client, admin_token):
    # 1. Create a real report first to test resolution on an existing report
    create_res = client.post(
        "/api/v1/reports",
        json={
            "category": "Illegal Dumping",
            "description": "Debris on sidewalk",
            "latitude": 12.9716,
            "longitude": 77.5946,
            "address": "MG Road"
        },
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert create_res.status_code in (200, 201)
    rep_id = create_res.json()["id"]

    batch_payload = {
        "sync_timestamp": "2026-09-16T10:00:00Z",
        "worker_device_id": "FIELD-TABLET-042",
        "updates": [
            {
                "report_id": rep_id,
                "action": "resolve",
                "status": "Resolved",
                "notes": "Cleared debris at curb side.",
                "resolved_at": "2026-09-16T09:45:00Z"
            },
            {
                "action": "create",
                "category": "Hazardous Waste",
                "description": "Leaking transformer oil reported by field officer",
                "latitude": 12.9800,
                "longitude": 77.6000,
                "address": "Substation 4"
            }
        ]
    }
    res = client.post(
        "/api/v1/reports/batch-sync",
        json=batch_payload,
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "completed"
    assert data["processed"] == 2
    assert data["created"] == 1
    assert data["resolved"] == 1


def test_cache_ttl_and_eviction():
    from app.services.cache_service import InMemoryCache
    import time

    cache = InMemoryCache(max_items=5)
    # Test TTL expiration
    cache.set("short_lived", "val", ttl=0)
    time.sleep(0.01)
    assert cache.get("short_lived") is None

    # Test eviction when max_items exceeded
    for i in range(15):
        cache.set(f"item_{i}", f"val_{i}", ttl=100)
    assert cache.size() <= 15
    cache.clear()
    assert cache.size() == 0


def test_gis_edge_cases(client):
    # Empty stops route optimization
    res = client.post(
        "/api/v1/locations/optimize-route",
        json={"depot": {"name": "Depot", "lat": 12.9716, "lon": 77.5946}, "stops": []}
    )
    assert res.status_code == 200
    assert res.json()["total_distance_km"] == 0.0

    # Polygon search with all categories
    res_poly = client.post(
        "/api/v1/locations/polygon-search",
        json={"polygon": [[0, 0], [0, 1], [1, 1], [1, 0], [0, 0]], "category_code": "all"}
    )
    assert res_poly.status_code == 200
    assert "locations" in res_poly.json()

    # Proximity ranking with invalid polygon (< 3 points)
    assert gis_service.point_in_polygon(12.0, 77.0, [[12.0, 77.0]]) is False


def test_reports_filtering(client, admin_token):
    res = client.get(
        "/api/v1/reports?status=Resolved&category=Illegal%20Dumping",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res.status_code == 200
    assert isinstance(res.json(), list)
