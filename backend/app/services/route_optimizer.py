from typing import List, Dict, Any
from app.services.spatial_engine import spatial_engine


class WasteCollectionRouteOptimizer:
    """
    Optimizes collection routes for municipal waste management compactors
    servicing overflowing IoT bins and collection centers.
    """

    AVERAGE_SPEED_KMH = 25.0  # Urban commercial vehicle average speed
    STOP_SERVICE_TIME_MIN = 8.0  # Emptying and compaction time per stop

    @classmethod
    def optimize_route(
        cls,
        depot_lat: float,
        depot_lon: float,
        stops: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Constructs an optimal visiting sequence using Nearest Neighbor TSP heuristic.
        stops: list of dicts with keys 'id', 'name', 'latitude', 'longitude', 'fill_level_pct'
        """
        if not stops:
            return {
                "route": [],
                "total_distance_km": 0.0,
                "estimated_duration_minutes": 0.0,
                "stops_count": 0
            }

        unvisited = list(stops)
        ordered_route = []
        curr_lat, curr_lon = depot_lat, depot_lon
        total_distance = 0.0

        while unvisited:
            # Find closest unvisited stop, prioritized by fill level
            closest_idx = 0
            best_score = float("inf")

            for idx, s in enumerate(unvisited):
                dist = spatial_engine.haversine_distance(curr_lat, curr_lon, s["latitude"], s["longitude"])
                # Urgent overflowing bins receive priority distance discounting
                urgency_factor = 0.8 if s.get("fill_level_pct", 0) > 85.0 else 1.0
                effective_score = dist * urgency_factor

                if effective_score < best_score:
                    best_score = effective_score
                    closest_idx = idx

            next_stop = unvisited.pop(closest_idx)
            leg_distance = spatial_engine.haversine_distance(curr_lat, curr_lon, next_stop["latitude"], next_stop["longitude"])
            total_distance += leg_distance

            ordered_route.append({
                **next_stop,
                "leg_distance_km": round(leg_distance, 2),
                "cumulative_distance_km": round(total_distance, 2)
            })

            curr_lat, curr_lon = next_stop["latitude"], next_stop["longitude"]

        # Return to depot leg
        return_dist = spatial_engine.haversine_distance(curr_lat, curr_lon, depot_lat, depot_lon)
        total_distance += return_dist

        travel_time_min = (total_distance / cls.AVERAGE_SPEED_KMH) * 60.0
        service_time_min = len(ordered_route) * cls.STOP_SERVICE_TIME_MIN
        total_time_min = travel_time_min + service_time_min

        return {
            "route": ordered_route,
            "total_distance_km": round(total_distance, 2),
            "estimated_duration_minutes": round(total_time_min, 1),
            "stops_count": len(ordered_route),
            "depot": {"latitude": depot_lat, "longitude": depot_lon}
        }


route_optimizer = WasteCollectionRouteOptimizer()
