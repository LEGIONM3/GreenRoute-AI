from typing import List, Optional, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status, UploadFile, File
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.core.database import get_db
from app.core.deps import get_current_user, get_current_admin_user
from app.models.location import Location
from app.models.location_category import LocationCategory
from app.models.user import User
from app.schemas.location import (
    LocationOut,
    LocationCreate,
    LocationUpdate,
    LocationCategoryOut
)
from app.services.gis_service import filter_and_rank_by_proximity, generate_directions_url, gis_service
from app.services.cache_service import cache_service
from app.core.config import settings

router = APIRouter()


@router.get("/categories", response_model=List[LocationCategoryOut])
def list_location_categories(db: Session = Depends(get_db)) -> Any:
    return db.query(LocationCategory).all()


@router.get("", response_model=List[LocationOut])
def get_locations(
    category_code: Optional[str] = Query(None, description="Filter by category code (e.g. dustbin, recycling, e_waste, hazardous)"),
    search: Optional[str] = Query(None, description="Search in name, address, or accepted waste types"),
    lat: Optional[float] = Query(None, description="User latitude for distance calculation"),
    lon: Optional[float] = Query(None, description="User longitude for distance calculation"),
    radius_km: Optional[float] = Query(None, description="Radius in kilometers"),
    db: Session = Depends(get_db)
) -> Any:
    cache_key = f"locations:{category_code or 'all'}:{search or 'all'}:{lat or 'none'}:{lon or 'none'}:{radius_km or 'none'}"
    if settings.CACHE_ENABLED:
        cached_result = cache_service.get(cache_key)
        if cached_result is not None:
            return cached_result

    query = db.query(Location).filter(Location.is_active == True)

    if category_code:
        cat = db.query(LocationCategory).filter(LocationCategory.code == category_code.lower()).first()
        if cat:
            query = query.filter(Location.category_id == cat.id)

    if search:
        search_pattern = f"%{search.lower()}%"
        query = query.filter(
            or_(
                Location.name.ilike(search_pattern),
                Location.address.ilike(search_pattern),
                Location.city.ilike(search_pattern),
                Location.accepted_waste_types_raw.ilike(search_pattern)
            )
        )

    locations = query.all()

    # Apply GIS proximity calculations if user coordinates are supplied
    if lat is not None and lon is not None:
        ranked = filter_and_rank_by_proximity(locations, lat, lon, radius_km)
        return ranked

    # Attach baseline directions url without origin
    for loc in locations:
        loc.directions_url = generate_directions_url(loc.latitude, loc.longitude)
        loc.distance_km = None

    if settings.CACHE_ENABLED and not (lat is not None and lon is not None):
        # Cache non-coordinate general results
        out_data = [LocationOut.model_validate(loc).model_dump() for loc in locations]
        cache_service.set(cache_key, out_data, ttl=settings.CACHE_FACILITY_TTL)

    return locations


@router.get("/{location_id}", response_model=LocationOut)
def get_location_by_id(
    location_id: str,
    lat: Optional[float] = Query(None),
    lon: Optional[float] = Query(None),
    db: Session = Depends(get_db)
) -> Any:
    location = db.query(Location).filter(Location.id == location_id, Location.is_active == True).first()
    if not location:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Disposal location not found"
        )
    
    if lat is not None and lon is not None:
        ranked = filter_and_rank_by_proximity([location], lat, lon)
        return ranked[0]
    
    location.directions_url = generate_directions_url(location.latitude, location.longitude)
    return location


@router.post("", response_model=LocationOut, status_code=status.HTTP_201_CREATED)
def create_location(
    payload: LocationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    # Check category exists
    cat = db.query(LocationCategory).filter(LocationCategory.id == payload.category_id).first()
    if not cat:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid category ID"
        )

    is_admin = current_user.role and current_user.role.name.lower() == "admin"

    location = Location(
        name=payload.name,
        description=payload.description,
        category_id=payload.category_id,
        latitude=payload.latitude,
        longitude=payload.longitude,
        address=payload.address,
        city=payload.city,
        postal_code=payload.postal_code,
        contact_phone=payload.contact_phone,
        is_verified=True if is_admin else False,  # Citizen proposals require verification
        created_by_id=current_user.id
    )
    location.accepted_waste_types = payload.accepted_waste_types
    location.operating_hours = payload.operating_hours

    db.add(location)
    db.commit()
    db.refresh(location)
    cache_service.invalidate_prefix("locations:")
    location.directions_url = generate_directions_url(location.latitude, location.longitude)
    return location


@router.put("/{location_id}", response_model=LocationOut)
def update_location(
    location_id: str,
    payload: LocationUpdate,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
) -> Any:
    location = db.query(Location).filter(Location.id == location_id).first()
    if not location:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Location not found")

    update_data = payload.model_dump(exclude_unset=True)
    
    if "accepted_waste_types" in update_data:
        location.accepted_waste_types = update_data.pop("accepted_waste_types")
    if "operating_hours" in update_data:
        location.operating_hours = update_data.pop("operating_hours")

    for field, value in update_data.items():
        setattr(location, field, value)

    db.commit()
    db.refresh(location)
    cache_service.invalidate_prefix("locations:")
    location.directions_url = generate_directions_url(location.latitude, location.longitude)
    return location


@router.delete("/{location_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_location(
    location_id: str,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
) -> None:
    location = db.query(Location).filter(Location.id == location_id).first()
    if not location:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Location not found")
    
    location.soft_delete()
    db.commit()
    cache_service.invalidate_prefix("locations:")


@router.post("/bulk-import")
async def bulk_import_locations(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
) -> Any:
    """Imports facilities from a CSV spreadsheet with error tolerance and validation."""
    import csv
    import io
    from app.services.audit_service import log_activity

    if not file.filename.endswith(".csv"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file must be a CSV (.csv)"
        )

    content = await file.read()
    try:
        text_stream = io.StringIO(content.decode("utf-8"))
    except UnicodeDecodeError:
        text_stream = io.StringIO(content.decode("latin-1"))

    reader = csv.DictReader(text_stream)
    imported = []
    errors = []
    
    categories = {c.code.lower(): c.id for c in db.query(LocationCategory).all()}
    categories_by_name = {c.name.lower(): c.id for c in db.query(LocationCategory).all()}

    default_cat_id = next(iter(categories.values()), None)

    for row_num, row in enumerate(reader, start=2):
        name = row.get("name", "").strip()
        if not name:
            errors.append(f"Row {row_num}: missing 'name'")
            continue

        try:
            lat = float(row.get("latitude", 0))
            lon = float(row.get("longitude", 0))
        except (ValueError, TypeError):
            errors.append(f"Row {row_num}: invalid latitude/longitude")
            continue

        cat_val = row.get("category_code", row.get("category", "")).strip().lower()
        cat_id = categories.get(cat_val) or categories_by_name.get(cat_val) or default_cat_id
        
        raw_types = row.get("accepted_waste_types", "[]")
        types_list = [t.strip() for t in raw_types.split(";") if t.strip()] if ";" in raw_types else [t.strip() for t in raw_types.split(",") if t.strip()]

        loc = Location(
            name=name,
            description=row.get("description", "").strip() or None,
            category_id=cat_id,
            latitude=lat,
            longitude=lon,
            address=row.get("address", "City Center").strip(),
            city=row.get("city", "Default City").strip(),
            postal_code=row.get("postal_code", "").strip() or None,
            contact_phone=row.get("contact_phone", "").strip() or None,
            is_verified=True,
            created_by_id=current_user.id
        )
        loc.accepted_waste_types = types_list
        loc.operating_hours = {"Mon-Sat": row.get("operating_hours", "08:00 AM - 06:00 PM")}
        db.add(loc)
        imported.append(name)

    db.commit()
    log_activity(
        db,
        action="BULK_IMPORT_LOCATIONS",
        resource="location",
        user_id=current_user.id,
        details={"imported_count": len(imported), "error_count": len(errors)}
    )

    return {
        "success": True,
        "imported_count": len(imported),
        "imported_locations": imported[:10],
        "errors": errors
    }


class PolygonSearchRequest(BaseModel):
    polygon: List[List[float]]
    category_code: Optional[str] = None


class RouteStop(BaseModel):
    name: Optional[str] = None
    lat: float
    lon: float


class RouteOptimizationRequest(BaseModel):
    depot: RouteStop
    stops: List[RouteStop]
    optimize_for: Optional[str] = "distance"


@router.post("/polygon-search")
def polygon_search_locations(
    payload: PolygonSearchRequest,
    db: Session = Depends(get_db)
) -> Any:
    """Finds all active disposal facilities within arbitrary GIS polygon boundaries."""
    query = db.query(Location).filter(Location.is_active == True)
    if payload.category_code and payload.category_code.lower() != "all":
        cat = db.query(LocationCategory).filter(LocationCategory.code == payload.category_code.lower()).first()
        if cat:
            query = query.filter(Location.category_id == cat.id)

    all_locs = query.all()
    matched = [
        loc for loc in all_locs
        if gis_service.point_in_polygon(loc.latitude, loc.longitude, payload.polygon)
    ]
    for loc in matched:
        loc.directions_url = generate_directions_url(loc.latitude, loc.longitude)
        loc.distance_km = None

    return {
        "count": len(matched),
        "locations": [LocationOut.model_validate(loc).model_dump() for loc in matched]
    }


@router.post("/optimize-route")
def optimize_collection_route(
    payload: RouteOptimizationRequest
) -> Any:
    """Computes an optimized traveling route for waste collection vehicles visiting smart bins/facilities."""
    depot_dict = payload.depot.model_dump()
    stops_dict = [s.model_dump() for s in payload.stops]
    result = gis_service.optimize_route(depot_dict, stops_dict)
    return result
