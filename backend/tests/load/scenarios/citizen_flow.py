"""
Citizen Journey Load Test Scenario
Flow: Login -> Search Disposal Facility -> Open Facility -> Ask AI Question -> Submit Report -> Logout
"""

import random
import time
from locust import task, TaskSet, tag
from tests.load.utils import CITIZEN_EMAIL, CITIZEN_PASSWORD, DEFAULT_TENANT_ID, get_auth_headers


class CitizenJourney(TaskSet):
    def on_start(self):
        self.token = None
        self.headers = get_auth_headers(None, DEFAULT_TENANT_ID)
        self.login()

    def login(self):
        """1. Citizen Login"""
        start_time = time.time()
        with self.client.post(
            "/api/v1/auth/login",
            json={"email": CITIZEN_EMAIL, "password": CITIZEN_PASSWORD},
            headers=self.headers,
            catch_response=True,
            name="/api/v1/auth/login [Citizen Journey]"
        ) as res:
            latency_ms = (time.time() - start_time) * 1000
            if res.status_code == 200:
                data = res.json()
                self.token = data.get("access_token")
                self.headers = get_auth_headers(self.token, DEFAULT_TENANT_ID)
                if latency_ms > 200:
                    res.failure(f"Auth latency SLA breached: {latency_ms:.1f}ms > 200ms")
                else:
                    res.success()
            else:
                res.failure(f"Login failed: {res.status_code}")

    @task(3)
    def search_disposal_facility(self):
        """2. Search Disposal Facility (Sub-100ms Target)"""
        params = random.choice([
            {"category_code": "recycling", "lat": 12.9716, "lon": 77.5946, "radius_km": 10},
            {"category_code": "e_waste", "lat": 12.9784, "lon": 77.6408, "radius_km": 15},
            {"search": "Center", "lat": 12.9352, "lon": 77.6245},
            {"search": "Plastic"}
        ])
        start_time = time.time()
        with self.client.get(
            "/api/v1/locations",
            params=params,
            headers=self.headers,
            catch_response=True,
            name="/api/v1/locations [Citizen Search]"
        ) as res:
            latency_ms = (time.time() - start_time) * 1000
            if res.status_code == 200:
                data = res.json()
                if latency_ms > 150:
                    res.failure(f"Search latency SLA breached: {latency_ms:.1f}ms > 150ms")
                else:
                    res.success()
                if data and isinstance(data, list) and len(data) > 0:
                    self.open_facility_detail(data[0].get("id"))
            else:
                res.failure(f"Search failed: {res.status_code}")

    def open_facility_detail(self, facility_id: str):
        """3. Open Facility Detail"""
        if not facility_id:
            return
        self.client.get(
            f"/api/v1/locations/{facility_id}",
            headers=self.headers,
            name="/api/v1/locations/{id} [Citizen Facility Detail]"
        )

    @task(2)
    def ask_ai_question(self):
        """4. Ask AI Question (Sub-2s Initial Response SLA)"""
        queries = [
            "How do I safely dispose of alkaline and lithium batteries?",
            "What is the schedule for dry waste collection?",
            "Where can I recycle large electronics and circuit boards?",
            "What are the penalties for dumping garden debris on the road?"
        ]
        payload = {
            "query": random.choice(queries),
            "session_id": f"citizen-sim-{random.randint(1000, 9999)}",
            "latitude": 12.9716,
            "longitude": 77.5946
        }
        start_time = time.time()
        with self.client.post(
            "/api/v1/chat/query",
            json=payload,
            headers=self.headers,
            catch_response=True,
            name="/api/v1/chat/query [Citizen RAG]"
        ) as res:
            latency = time.time() - start_time
            if res.status_code == 200:
                if latency > 2.5:
                    res.failure(f"RAG query SLA breached: {latency:.2f}s > 2.5s")
                else:
                    res.success()
            else:
                res.failure(f"AI query failed: {res.status_code}")

    @task(1)
    def submit_report(self):
        """5. Submit Incident Report"""
        if not self.token:
            return
        payload = {
            "category": random.choice(["Illegal Dumping", "Overflowing Bin", "Hazardous Waste"]),
            "description": f"Citizen observed uncollected waste near intersection #{random.randint(100, 999)}",
            "latitude": 12.9716 + (random.random() - 0.5) * 0.04,
            "longitude": 77.5946 + (random.random() - 0.5) * 0.04,
            "address": "Municipal Sector 4 Avenue"
        }
        with self.client.post(
            "/api/v1/reports",
            json=payload,
            headers=self.headers,
            catch_response=True,
            name="/api/v1/reports [Citizen Submission]"
        ) as res:
            if res.status_code in (200, 201):
                res.success()
            else:
                res.failure(f"Submit report failed: {res.status_code}")

    def on_stop(self):
        """6. Citizen Logout / Session Termination"""
        if self.token:
            self.client.post(
                "/api/v1/auth/logout",
                headers=self.headers,
                name="/api/v1/auth/logout [Citizen Logout]"
            )
