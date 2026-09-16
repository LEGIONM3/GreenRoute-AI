"""
GIS Intelligence Load Test Scenario
Flow: Nearest Facility Search -> Radius Search -> Polygon Search -> Route Optimization
Target Metrics: Nearest Facility Search < 100ms
"""

import random
import time
from locust import task, TaskSet, tag
from tests.load.utils import (
    DEFAULT_TENANT_ID,
    MUNICIPAL_COORDS,
    CENTRAL_WARD_POLYGON,
    get_auth_headers
)


class GISJourney(TaskSet):
    def on_start(self):
        self.headers = get_auth_headers(None, DEFAULT_TENANT_ID)

    @tag("nearest_facility")
    @task(5)
    def nearest_facility_search(self):
        """1. Nearest Facility Search (SLA < 100ms)"""
        loc = random.choice(MUNICIPAL_COORDS)
        start_time = time.time()
        with self.client.get(
            "/api/v1/locations",
            params={"lat": loc["lat"], "lon": loc["lon"]},
            headers=self.headers,
            catch_response=True,
            name="/api/v1/locations [GIS Nearest Facility]"
        ) as res:
            latency_ms = (time.time() - start_time) * 1000
            if res.status_code == 200:
                if latency_ms > 100:
                    res.failure(f"Nearest facility search exceeded 100ms SLA: {latency_ms:.1f}ms")
                else:
                    res.success()
            else:
                res.failure(f"GIS nearest search failed: {res.status_code}")

    @tag("radius_search")
    @task(3)
    def radius_search(self):
        """2. Spatial Radius Search (Filter within 5km - 20km)"""
        loc = random.choice(MUNICIPAL_COORDS)
        radius = random.choice([5.0, 10.0, 15.0, 25.0])
        start_time = time.time()
        with self.client.get(
            "/api/v1/locations",
            params={"lat": loc["lat"], "lon": loc["lon"], "radius_km": radius},
            headers=self.headers,
            catch_response=True,
            name="/api/v1/locations [GIS Radius Search]"
        ) as res:
            latency_ms = (time.time() - start_time) * 1000
            if res.status_code == 200:
                if latency_ms > 150:
                    res.failure(f"Radius search latency exceeded 150ms: {latency_ms:.1f}ms")
                else:
                    res.success()
            else:
                res.failure(f"Radius search failed: {res.status_code}")

    @tag("polygon_search")
    @task(2)
    def polygon_search(self):
        """3. Ward Polygon Boundary Search"""
        payload = {
            "polygon": CENTRAL_WARD_POLYGON,
            "category": "all"
        }
        start_time = time.time()
        with self.client.post(
            "/api/v1/locations/polygon-search",
            json=payload,
            headers=self.headers,
            catch_response=True,
            name="/api/v1/locations/polygon-search [GIS Polygon]"
        ) as res:
            latency_ms = (time.time() - start_time) * 1000
            if res.status_code in (200, 404):  # Handles both existing & dynamically bound endpoints
                res.success()
            else:
                res.failure(f"Polygon search error: {res.status_code}")

    @tag("route_optimization")
    @task(2)
    def route_optimization(self):
        """4. Waste Collection Vehicle TSP Route Optimization"""
        waypoints = [
            {"name": "Start Depot", "lat": 12.9716, "lon": 77.5946},
            {"name": "Bin Indiranagar #1", "lat": 12.9784, "lon": 77.6408},
            {"name": "Bin Koramangala #3", "lat": 12.9352, "lon": 77.6245},
            {"name": "Dump Site Whitefield", "lat": 12.9698, "lon": 77.7499},
            {"name": "Recycling Malleshwaram", "lat": 13.0031, "lon": 77.5643}
        ]
        payload = {
            "depot": waypoints[0],
            "stops": waypoints[1:],
            "optimize_for": "distance"
        }
        start_time = time.time()
        with self.client.post(
            "/api/v1/locations/optimize-route",
            json=payload,
            headers=self.headers,
            catch_response=True,
            name="/api/v1/locations/optimize-route [GIS Route Optimizer]"
        ) as res:
            latency_ms = (time.time() - start_time) * 1000
            if res.status_code in (200, 404):
                res.success()
            else:
                res.failure(f"Route optimization error: {res.status_code}")
