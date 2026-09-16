"""
Reporting Journey Load Test Scenario
Simulates high-volume incident filings, multi-criteria report filtering, and field worker resolution queues.
"""

import random
import time
from locust import task, TaskSet, tag
from tests.load.utils import (
    CITIZEN_EMAIL,
    CITIZEN_PASSWORD,
    DEFAULT_TENANT_ID,
    get_auth_headers
)


class ReportingJourney(TaskSet):
    def on_start(self):
        self.token = None
        self.headers = get_auth_headers(None, DEFAULT_TENANT_ID)
        self.login()

    def login(self):
        res = self.client.post(
            "/api/v1/auth/login",
            json={"email": CITIZEN_EMAIL, "password": CITIZEN_PASSWORD},
            headers=self.headers
        )
        if res.status_code == 200:
            self.token = res.json().get("access_token")
            self.headers = get_auth_headers(self.token, DEFAULT_TENANT_ID)

    @tag("create_report")
    @task(3)
    def create_incident_report(self):
        """Create new complaint / illegal dumping report."""
        payload = {
            "category": random.choice(["Illegal Dumping", "Overflowing Bin", "Hazardous Waste", "Plastic Debris"]),
            "description": f"Incident reported at road marker {random.randint(100, 999)} - Urgent cleanup requested",
            "latitude": 12.9716 + (random.random() - 0.5) * 0.05,
            "longitude": 77.5946 + (random.random() - 0.5) * 0.05,
            "address": "Ring Road Sector 12"
        }
        start_time = time.time()
        with self.client.post(
            "/api/v1/reports",
            json=payload,
            headers=self.headers,
            catch_response=True,
            name="/api/v1/reports [Create Incident Report]"
        ) as res:
            latency_ms = (time.time() - start_time) * 1000
            if res.status_code in (200, 201):
                if latency_ms > 400:
                    res.failure(f"Report creation exceeded 400ms: {latency_ms:.1f}ms")
                else:
                    res.success()
            else:
                res.failure(f"Failed to create report: {res.status_code}")

    @tag("list_reports")
    @task(4)
    def list_reports(self):
        """List citizen reports with pagination & filters."""
        params = random.choice([
            {"status": "Open"},
            {"status": "Resolved"},
            {"only_mine": "true"},
            {"category": "Illegal Dumping"}
        ])
        start_time = time.time()
        with self.client.get(
            "/api/v1/reports",
            params=params,
            headers=self.headers,
            catch_response=True,
            name="/api/v1/reports [List Filtered Reports]"
        ) as res:
            latency_ms = (time.time() - start_time) * 1000
            if res.status_code == 200:
                if latency_ms > 250:
                    res.failure(f"List reports latency breached SLA: {latency_ms:.1f}ms")
                else:
                    res.success()
            else:
                res.failure(f"List reports failed: {res.status_code}")
