"""
Admin Journey Load Test Scenario
Flow: Login -> Open Dashboard -> Load Metrics -> Update Facility -> Review Report -> Logout
Target Metrics: Dashboard < 500ms, Auth < 100ms
"""

import random
import time
from locust import task, TaskSet, tag
from tests.load.utils import ADMIN_EMAIL, ADMIN_PASSWORD, DEFAULT_TENANT_ID, get_auth_headers


class AdminJourney(TaskSet):
    def on_start(self):
        self.token = None
        self.headers = get_auth_headers(None, DEFAULT_TENANT_ID)
        self.facility_id = None
        self.login()

    def login(self):
        """1. Admin Login"""
        start_time = time.time()
        with self.client.post(
            "/api/v1/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
            headers=self.headers,
            catch_response=True,
            name="/api/v1/auth/login [Admin Journey]"
        ) as res:
            latency_ms = (time.time() - start_time) * 1000
            if res.status_code == 200:
                self.token = res.json().get("access_token")
                self.headers = get_auth_headers(self.token, DEFAULT_TENANT_ID)
                if latency_ms > 200:
                    res.failure(f"Admin auth latency breached SLA: {latency_ms:.1f}ms > 200ms")
                else:
                    res.success()
            else:
                res.failure(f"Admin login failed: {res.status_code}")

    @task(4)
    def open_dashboard_and_metrics(self):
        """2. Open Dashboard & 3. Load Overview Metrics (Target < 500ms)"""
        start_time = time.time()
        with self.client.get(
            "/api/v1/admin/metrics",
            headers=self.headers,
            catch_response=True,
            name="/api/v1/admin/metrics [Admin Dashboard Overview]"
        ) as res:
            latency_ms = (time.time() - start_time) * 1000
            if res.status_code == 200:
                if latency_ms > 500:
                    res.failure(f"Admin metrics exceeded 500ms threshold: {latency_ms:.1f}ms")
                else:
                    res.success()
            else:
                res.failure(f"Failed to load admin metrics: {res.status_code}")

        # Also load smart bins overview
        self.client.get(
            "/api/v1/admin/smart-bins",
            headers=self.headers,
            name="/api/v1/admin/smart-bins [Admin Smart Bins]"
        )

    @task(2)
    def update_facility(self):
        """4. Update Facility Details"""
        if not self.token:
            return
        # Fetch one facility first
        res = self.client.get(
            "/api/v1/locations?search=Center",
            headers=self.headers,
            name="/api/v1/locations [Admin Fetch Before Update]"
        )
        if res.status_code == 200 and res.json():
            facility = res.json()[0]
            fac_id = facility["id"]
            payload = {
                "description": f"Verified Municipal Center - Operational check at {time.strftime('%H:%M:%S')}",
                "operating_hours": {"Mon-Sun": "07:00 AM - 08:00 PM"}
            }
            with self.client.put(
                f"/api/v1/locations/{fac_id}",
                json=payload,
                headers=self.headers,
                catch_response=True,
                name="/api/v1/locations/{id} [Admin Update Facility]"
            ) as update_res:
                if update_res.status_code == 200:
                    update_res.success()
                else:
                    update_res.failure(f"Facility update failed: {update_res.status_code}")

    @task(3)
    def review_and_triage_report(self):
        """5. Review Report & Triage Status"""
        if not self.token:
            return
        res = self.client.get(
            "/api/v1/reports",
            headers=self.headers,
            name="/api/v1/reports [Admin List Reports]"
        )
        if res.status_code == 200:
            reports = res.json()
            if reports and isinstance(reports, list) and len(reports) > 0:
                target_report = reports[0]
                rep_id = target_report["id"]
                current_status = target_report.get("status", "Open")
                next_status = "In Progress" if current_status == "Open" else "Resolved"
                self.client.patch(
                    f"/api/v1/reports/{rep_id}",
                    json={"status": next_status, "admin_notes": "Triaged by load test runner."},
                    headers=self.headers,
                    name="/api/v1/reports/{id} [Admin Triage Report]"
                )

    def on_stop(self):
        """6. Admin Logout"""
        if self.token:
            self.client.post(
                "/api/v1/auth/logout",
                headers=self.headers,
                name="/api/v1/auth/logout [Admin Logout]"
            )
