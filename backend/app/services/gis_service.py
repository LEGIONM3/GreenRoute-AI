import math
from typing import List, Optional, Tuple, Any


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate the great circle distance in kilometers between two points 
    on the earth (specified in decimal degrees).
    """
    # Earth radius in kilometers
    R = 6371.0

    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)
    
    a = (
        math.sin(d_lat / 2.0) ** 2 +
        math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
        math.sin(d_lon / 2.0) ** 2
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    distance = R * c
    return round(distance, 2)


def generate_directions_url(dest_lat: float, dest_lon: float, origin_lat: Optional[float] = None, origin_lon: Optional[float] = None) -> str:
    """
    Generate OpenStreetMap / navigation direction deep link.
    """
    if origin_lat is not None and origin_lon is not None:
        return f"https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route={origin_lat}%2C{origin_lon}%3B{dest_lat}%2C{dest_lon}"
    return f"https://www.openstreetmap.org/?mlat={dest_lat}&mlon={dest_lon}#map=16/{dest_lat}/{dest_lon}"


def filter_and_rank_by_proximity(
    locations: list,
    user_lat: float,
    user_lon: float,
    max_radius_km: Optional[float] = None
) -> list:
    """
    Computes distance for each location, optionally filters by radius,
    and returns list sorted by nearest first.
    """
    results = []
    for loc in locations:
        dist = haversine_distance(user_lat, user_lon, loc.latitude, loc.longitude)
        if max_radius_km is not None and dist > max_radius_km:
            continue
        
        # Attach dynamic attributes
        loc.distance_km = dist
        loc.directions_url = generate_directions_url(loc.latitude, loc.longitude, user_lat, user_lon)
        results.append(loc)
    
    results.sort(key=lambda x: x.distance_km if x.distance_km is not None else float("inf"))
    return results


class GISService:
    def get_nearby_locations(
        self,
        db,
        latitude: float,
        longitude: float,
        radius_km: float = 15.0,
        limit: int = 5
    ) -> List[Tuple[Any, float]]:
        from app.models.location import Location
        locations = db.query(Location).filter(Location.is_active == True).all()
        ranked = filter_and_rank_by_proximity(locations, latitude, longitude, max_radius_km=radius_km)
        return [(loc, loc.distance_km) for loc in ranked[:limit]]

    def point_in_polygon(self, lat: float, lon: float, polygon: List[List[float]]) -> bool:
        """
        Ray-casting algorithm to determine if a (lat, lon) coordinate 
        lies within a closed polygon of vertices [[lat, lon], ...].
        """
        if not polygon or len(polygon) < 3:
            return False
        inside = False
        n = len(polygon)
        p1_lat, p1_lon = polygon[0]
        for i in range(1, n + 1):
            p2_lat, p2_lon = polygon[i % n]
            if min(p1_lat, p2_lat) < lat <= max(p1_lat, p2_lat):
                if lon <= max(p1_lon, p2_lon):
                    if p1_lat != p2_lat:
                        xinters = (lat - p1_lat) * (p2_lon - p1_lon) / (p2_lat - p1_lat) + p1_lon
                    else:
                        xinters = p1_lon
                    if p1_lon == p2_lon or lon <= xinters:
                        inside = not inside
            p1_lat, p1_lon = p2_lat, p2_lon
        return inside

    def optimize_route(self, depot: dict, stops: List[dict]) -> dict:
        """
        Computes an optimized waste collection vehicle route from depot across waypoints
        using a greedy nearest-neighbor heuristic with distance tracking.
        """
        if not stops:
            return {"route": [depot], "waypoints": [depot], "total_distance_km": 0.0, "stops_count": 0}

        unvisited = list(stops)
        current = depot
        ordered = [depot]
        total_dist = 0.0

        while unvisited:
            nearest_idx = 0
            min_dist = float("inf")
            for i, stop in enumerate(unvisited):
                d = haversine_distance(current["lat"], current["lon"], stop["lat"], stop["lon"])
                if d < min_dist:
                    min_dist = d
                    nearest_idx = i
            next_stop = unvisited.pop(nearest_idx)
            total_dist += min_dist
            ordered.append(next_stop)
            current = next_stop

        return {
            "route": ordered,
            "waypoints": ordered,
            "total_distance_km": round(total_dist, 2),
            "stops_count": len(stops)
        }


gis_service = GISService()
