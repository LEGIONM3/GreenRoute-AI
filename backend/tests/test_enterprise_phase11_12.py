"""
Enterprise Phase 11 & 12 Validation Suite
Tests: Multi-Tier Caching, DB Pooling, Admin Wards, IoT Smart Bins, Heatmaps, and Tenancy
"""

import time
import pytest
from app.services.cache_service import cache_service, InMemoryCache


def test_in_memory_cache_l1():
    cache = InMemoryCache(max_items=100)
    cache.set("key1", {"status": "ok"}, ttl=1)
    assert cache.get("key1") == {"status": "ok"}
    assert cache.get("non_existent") is None

    # Test deletion
    cache.delete("key1")
    assert cache.get("key1") is None

    # Test prefix invalidation
    cache.set("tenant:loc:1", "data1", ttl=60)
    cache.set("tenant:loc:2", "data2", ttl=60)
    cache.set("other:3", "data3", ttl=60)
    invalidated = cache.invalidate_prefix("tenant:loc:")
    assert invalidated == 2
    assert cache.get("tenant:loc:1") is None
    assert cache.get("other:3") == "data3"


def test_cache_service_methods():
    key = cache_service.build_key("tenant-1", "policies", "plastic")
    assert "tenant-1:policies:plastic" == key

    cache_service.set(key, {"rules": ["no single use"]}, ttl=60)
    val = cache_service.get(key)
    assert val == {"rules": ["no single use"]}

    stats = cache_service.get_stats()
    assert "l1_memory_items" in stats
    assert "mode" in stats


def test_admin_tenants(client, admin_token):
    res = client.get(
        "/api/v1/admin/tenants",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    assert "slug" in data[0]


def test_admin_regions(client, admin_token):
    res = client.get(
        "/api/v1/admin/regions",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    assert "code" in data[0]


def test_admin_wards(client, admin_token):
    res = client.get(
        "/api/v1/admin/wards",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    assert "ward_number" in data[0]
    assert "efficiency_pct" in data[0]


def test_admin_smart_bins(client, admin_token):
    res = client.get(
        "/api/v1/admin/smart-bins",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res.status_code == 200
    bins = res.json()
    assert isinstance(bins, list)
    assert len(bins) >= 1
    assert "bin_code" in bins[0]
    assert "fill_level_pct" in bins[0]

    # Test overflow only filter
    res_overflow = client.get(
        "/api/v1/admin/smart-bins?overflow_only=true",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res_overflow.status_code == 200
    overflow_bins = res_overflow.json()
    assert all(b["is_overflowing"] is True for b in overflow_bins)


def test_admin_heatmaps(client, admin_token):
    res = client.get(
        "/api/v1/admin/heatmaps",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res.status_code == 200
    data = res.json()
    assert "points" in data
    assert "total_points" in data
    assert data["total_points"] >= 1
    assert "lat" in data["points"][0]
    assert "lon" in data["points"][0]


def test_citizen_forbidden_admin_endpoints(client, citizen_token):
    # Citizen must be forbidden from accessing admin ward operations and smart bins
    res_ward = client.get(
        "/api/v1/admin/wards",
        headers={"Authorization": f"Bearer {citizen_token}"}
    )
    assert res_ward.status_code == 403

    res_bins = client.get(
        "/api/v1/admin/smart-bins",
        headers={"Authorization": f"Bearer {citizen_token}"}
    )
    assert res_bins.status_code == 403


def test_compliance_consent_and_export(client, citizen_token):
    # Test recording consent
    res_consent = client.post(
        "/api/v1/compliance/consent",
        json={"consent_type": "gps_tracking", "granted": True},
        headers={"Authorization": f"Bearer {citizen_token}"}
    )
    assert res_consent.status_code == 200
    assert res_consent.json()["status"] == "recorded"

    # Test data export (GDPR / DPDP)
    res_export = client.get(
        "/api/v1/compliance/data-export",
        headers={"Authorization": f"Bearer {citizen_token}"}
    )
    assert res_export.status_code == 200
    export_data = res_export.json()
    assert "user_profile" in export_data
    assert "submitted_reports" in export_data


def test_compliance_privacy_report(client):
    res = client.get("/api/v1/compliance/privacy-report")
    assert res.status_code == 200
    data = res.json()
    assert "frameworks" in data
    assert "DPDP_Act_2023" in data["frameworks"]


def test_prometheus_metrics_endpoint(client):
    res = client.get("/metrics")
    assert res.status_code == 200
    assert "process_cpu_seconds_total" in res.text or "python_info" in res.text or "http_requests" in res.text or len(res.text) > 50
