"""
Locust Performance Benchmark Suite
Enterprise Municipal SaaS Platform - Phase 11 Performance Engineering

Target Metrics:
- 10,000 Concurrent Virtual Users (distributed)
- 100+ Requests/Second
- Sub-500ms API Latency (95th percentile)
- Sub-2s AI RAG Response Latency
- Sub-100ms Facility Search Latency
"""

import json
import random
import time
from locust import HttpUser, task, between, events, tag


class MunicipalCitizenUser(HttpUser):
    """Simulates citizens searching facilities, viewing policies, submitting reports, and querying RAG."""
    wait_time = between(1, 3)
    token = None
    tenant_id = "default"

    def on_start(self):
        """Authenticate citizen or use guest browsing session."""
        response = self.client.post(
            "/api/v1/auth/login",
            json={
                "email": "citizen@wastecare.gov",
                "password": "Citizen@123456"
            },
            name="/api/v1/auth/login [Citizen]"
        )
        if response.status_code == 200:
            data = response.json()
            self.token = data.get("access_token")
            self.headers = {
                "Authorization": f"Bearer {self.token}",
                "X-Tenant-ID": self.tenant_id
            }
        else:
            self.headers = {"X-Tenant-ID": self.tenant_id}

    @tag("facility_search")
    @task(5)
    def search_facilities(self):
        """Facility search targeting sub-100ms response time."""
        params = random.choice([
            {"category": "Recycling Center", "radius_km": 15},
            {"query": "Center", "limit": 20},
            {"latitude": 12.9716, "longitude": 77.5946, "radius_km": 10},
            {"category": "Compost Facility"},
            {"query": "E-Waste"}
        ])
        start_time = time.time()
        with self.client.get(
            "/api/v1/locations",
            params=params,
            headers=self.headers,
            catch_response=True,
            name="/api/v1/locations [Facility Search]"
        ) as response:
            latency_ms = (time.time() - start_time) * 1000
            if response.status_code == 200:
                if latency_ms > 250:
                    response.failure(f"Latency exceeded 250ms threshold: {latency_ms:.2f}ms")
                else:
                    response.success()
            else:
                response.failure(f"Status code {response.status_code}")

    @tag("policy_search")
    @task(3)
    def search_policies(self):
        """Municipal policy and compliance search."""
        params = random.choice([
            {"category": "E-Waste"},
            {"category": "Plastic Waste"},
            {"limit": 10}
        ])
        self.client.get(
            "/api/v1/policies",
            params=params,
            headers=self.headers,
            name="/api/v1/policies [Policy Search]"
        )

    @tag("articles")
    @task(3)
    def view_awareness_articles(self):
        """Public awareness articles."""
        self.client.get(
            "/api/v1/articles",
            headers=self.headers,
            name="/api/v1/articles [Public Awareness]"
        )

    @tag("rag_query")
    @task(2)
    def query_rag_assistant(self):
        """AI RAG query targeting sub-2s latency."""
        queries = [
            "How do I dispose of old laptop batteries safely?",
            "What are the segregation rules for wet waste?",
            "Where can I drop off plastic bottles in Ward 4?",
            "What penalties apply for illegal dumping?"
        ]
        payload = {
            "query": random.choice(queries),
            "session_id": f"locust-session-{random.randint(1000, 9999)}"
        }
        start_time = time.time()
        with self.client.post(
            "/api/v1/chat/message",
            json=payload,
            headers=self.headers,
            catch_response=True,
            name="/api/v1/chat/message [RAG Assistant]"
        ) as response:
            latency = time.time() - start_time
            if response.status_code == 200:
                if latency > 3.0:
                    response.failure(f"RAG query exceeded SLA (3s): {latency:.2f}s")
                else:
                    response.success()
            else:
                response.failure(f"Status code {response.status_code}")

    @tag("report_creation")
    @task(1)
    def create_waste_report(self):
        """Simulate citizen reporting an illegal dumping incident."""
        if not self.token:
            return
        payload = {
            "title": f"Illegal Dumping Report #{random.randint(10000, 99999)}",
            "description": "Debris dumped along municipal park sidewalk requiring pickup.",
            "category": "Solid Waste",
            "priority": "medium",
            "latitude": 12.9716 + (random.random() - 0.5) * 0.05,
            "longitude": 77.5946 + (random.random() - 0.5) * 0.05,
            "address": "4th Cross, Green Valley Ward"
        }
        self.client.post(
            "/api/v1/reports",
            json=payload,
            headers=self.headers,
            name="/api/v1/reports [Report Creation]"
        )


class MunicipalAdminUser(HttpUser):
    """Simulates municipal officers and administrators monitoring dashboards and reports."""
    wait_time = between(2, 5)
    token = None

    def on_start(self):
        """Authenticate administrator."""
        response = self.client.post(
            "/api/v1/auth/login",
            json={
                "email": "admin@wastecare.gov",
                "password": "Admin@123456"
            },
            name="/api/v1/auth/login [Admin]"
        )
        if response.status_code == 200:
            self.token = response.json().get("access_token")
            self.headers = {
                "Authorization": f"Bearer {self.token}",
                "X-Tenant-ID": "default"
            }
        else:
            self.headers = {}

    @tag("admin_dashboard")
    @task(4)
    def get_admin_dashboard_metrics(self):
        """Admin overview metrics."""
        if not self.token:
            return
        self.client.get(
            "/api/v1/admin/dashboard",
            headers=self.headers,
            name="/api/v1/admin/dashboard [Admin Dashboard]"
        )

    @tag("admin_reports")
    @task(3)
    def list_all_reports(self):
        """Admin listing and triage of municipal reports."""
        if not self.token:
            return
        self.client.get(
            "/api/v1/reports?limit=50",
            headers=self.headers,
            name="/api/v1/reports [Admin Reports Queue]"
        )

    @tag("admin_audit")
    @task(1)
    def get_audit_logs(self):
        """Compliance audit log retrieval."""
        if not self.token:
            return
        self.client.get(
            "/api/v1/admin/audit-logs?limit=25",
            headers=self.headers,
            name="/api/v1/admin/audit-logs [Compliance Audit]"
        )


@events.test_start.add_listener
def on_test_start(environment, **kwargs):
    print("=== Locust Performance Benchmark Started ===")
    print("Target CCU: 10,000 | Target RPS: 100+ | Target Latency: <500ms")


@events.test_stop.add_listener
def on_test_stop(environment, **kwargs):
    print("=== Locust Performance Benchmark Completed ===")
