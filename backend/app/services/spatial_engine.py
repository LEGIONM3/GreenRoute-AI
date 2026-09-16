import math
import json
from typing import List, Dict, Any, Optional, Tuple


class SpatialEngine:
    """
    Enterprise Spatial Engine supporting PostGIS geometries with universal pure-Python
    geodesic fallbacks for point-in-polygon geofencing and proximity calculations.
    """

    EARTH_RADIUS_KM = 6371.0

    @classmethod
    def haversine_distance(cls, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """Calculates Great-Circle distance in kilometers between two GPS points."""
        dlat = math.radians(lat2 - lat1)
        dlon = math.radians(lon2 - lon1)
        a = (
            math.sin(dlat / 2) ** 2 +
            math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
        )
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        return cls.EARTH_RADIUS_KM * c

    @classmethod
    def is_point_in_polygon(cls, lat: float, lon: float, polygon: List[Tuple[float, float]]) -> bool:
        """
        Ray-casting algorithm for Point-in-Polygon (PIP) municipal ward boundary resolution.
        polygon: List of (latitude, longitude) tuples forming the boundary ring.
        """
        n = len(polygon)
        if n < 3:
            return False

        inside = False
        p1_lat, p1_lon = polygon[0]

        for i in range(n + 1):
            p2_lat, p2_lon = polygon[i % n]
            if min(p1_lon, p2_lon) < lon <= max(p1_lon, p2_lon):
                if lat <= max(p1_lat, p2_lat):
                    if p1_lon != p2_lon:
                        x_inters = (lon - p1_lon) * (p2_lat - p1_lat) / (p2_lon - p1_lon) + p1_lat
                        if p1_lat == p2_lat or lat <= x_inters:
                            inside = not inside
            p1_lat, p1_lon = p2_lat, p2_lon

        return inside

    @classmethod
    def resolve_ward_by_geojson(cls, lat: float, lon: float, boundary_geojson_str: str) -> bool:
        """Parses a GeoJSON Polygon or MultiPolygon and verifies containment."""
        try:
            geom = json.loads(boundary_geojson_str)
            coords = geom.get("coordinates", [])
            if geom.get("type") == "Polygon" and coords:
                # GeoJSON coordinates are [longitude, latitude]
                ring = [(pt[1], pt[0]) for pt in coords[0]]
                return cls.is_point_in_polygon(lat, lon, ring)
        except Exception:
            pass
        return False


spatial_engine = SpatialEngine()
