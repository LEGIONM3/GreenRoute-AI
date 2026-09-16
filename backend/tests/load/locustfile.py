"""
Master Locust Performance Benchmark Runner
Enterprise Municipal SaaS Platform - Phase 11 Performance Engineering

Validates:
- Target CCU: 10,000 Concurrent Virtual Users
- Target Throughput: 100+ Requests/Second
- Latency SLAs:
    - API P50 < 150ms, P95 < 500ms, P99 < 1s
    - GIS Nearest Facility Search < 100ms
    - Authentication < 100ms
    - AI Initial Response < 2s
    - Admin Dashboard < 500ms
"""

from locust import HttpUser, between, events
from tests.load.scenarios.citizen_flow import CitizenJourney
from tests.load.scenarios.admin_flow import AdminJourney
from tests.load.scenarios.gis_flow import GISJourney
from tests.load.scenarios.rag_flow import RAGJourney
from tests.load.scenarios.reporting_flow import ReportingJourney


class CitizenUser(HttpUser):
    """Simulates general municipal citizens browsing facilities, querying RAG, filing reports."""
    wait_time = between(1, 3)
    tasks = [CitizenJourney]
    weight = 6


class AdminUser(HttpUser):
    """Simulates municipal officers monitoring ward health, updating facilities, reviewing SLA queues."""
    wait_time = between(2, 5)
    tasks = [AdminJourney]
    weight = 2


class GISUser(HttpUser):
    """Simulates high-frequency map lookups, radius searches, polygon ward filters, route optimizations."""
    wait_time = between(0.5, 2)
    tasks = [GISJourney]
    weight = 4


class RAGUser(HttpUser):
    """Simulates AI-driven citizen policy clarifications and LLM streaming completions."""
    wait_time = between(2, 6)
    tasks = [RAGJourney]
    weight = 2


class ReportingUser(HttpUser):
    """Simulates peak incident reporting spikes (monsoons, holiday cleanups, community drives)."""
    wait_time = between(1, 4)
    tasks = [ReportingJourney]
    weight = 3


@events.test_start.add_listener
def on_test_start(environment, **kwargs):
    print("=================================================================")
    print("MUNICIPAL SAAS ENTERPRISE LOAD BENCHMARK STARTED")
    print("Scenarios Active: Citizen, Admin, GIS, RAG, Reporting")
    print("SLA Thresholds: API P95 < 500ms | GIS < 100ms | RAG < 2s | Auth < 100ms")
    print("=================================================================")


@events.test_stop.add_listener
def on_test_stop(environment, **kwargs):
    print("=================================================================")
    print("MUNICIPAL SAAS ENTERPRISE LOAD BENCHMARK COMPLETED")
    print("=================================================================")
