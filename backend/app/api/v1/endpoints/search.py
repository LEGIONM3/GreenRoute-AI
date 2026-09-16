from typing import List, Optional, Any, Tuple
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.waste_item import WasteItem
from app.models.location import Location
from app.models.location_category import LocationCategory
from app.schemas.waste_item import WasteItemOut, WasteSearchResponse
from app.services.gis_service import filter_and_rank_by_proximity, generate_directions_url

router = APIRouter()


# Comprehensive bidirectional synonym & typo normalization dictionary
SYNONYM_MAP = {
    "battery": ["batteries", "cell", "powerbank", "accumulator", "dry cell", "batry"],
    "batteries": ["battery", "cell", "powerbank", "dry cell", "batry"],
    "batry": ["battery", "batteries", "cell"],
    "mobile": ["phone", "smartphone", "cellphone", "handset", "iphone", "android", "phne"],
    "phone": ["mobile", "smartphone", "cellphone", "handset", "phne"],
    "phne": ["phone", "mobile", "smartphone", "cellphone"],
    "bulb": ["lamp", "light", "cfl", "tube light", "led", "fluorescent"],
    "lamp": ["bulb", "light", "cfl", "tube light"],
    "tyre": ["tire", "rubber", "wheel"],
    "tire": ["tyre", "rubber", "wheel"],
    "medicine": ["medicines", "meds", "pills", "tablets", "capsules", "drugs", "syrup", "medisin"],
    "medicines": ["medicine", "pills", "tablets", "capsules", "drugs"],
    "medisin": ["medicine", "medicines", "pills", "tablets"],
    "bottle": ["bottles", "flask", "jar", "container", "can", "botle"],
    "botle": ["bottle", "bottles"],
    "plastic": ["polythene", "plastic bag", "wrapper", "poly", "plastc"],
    "plastc": ["plastic", "polythene"],
    "thermocol": ["styrofoam", "eps", "foam", "thermacol"],
    "thermacol": ["thermocol", "styrofoam", "eps"],
    "wire": ["cable", "cord", "charger"],
    "cable": ["wire", "cord", "charger"],
    "box": ["carton", "cardboard", "package"],
    "bag": ["sack", "pouch", "tote"]
}


def levenshtein_distance(s1: str, s2: str) -> int:
    """Computes Levenshtein edit distance for typo tolerance."""
    if len(s1) < len(s2):
        return levenshtein_distance(s2, s1)
    if len(s2) == 0:
        return len(s1)
    previous_row = range(len(s2) + 1)
    for i, c1 in enumerate(s1):
        current_row = [i + 1]
        for j, c2 in enumerate(s2):
            insertions = previous_row[j + 1] + 1
            deletions = current_row[j] + 1
            substitutions = previous_row[j] + (c1 != c2)
            current_row.append(min(insertions, deletions, substitutions))
        previous_row = current_row
    return previous_row[-1]


@router.get("/waste", response_model=WasteSearchResponse)
def search_waste_disposal(
    q: str = Query(..., min_length=2, description="Item name (e.g. plastic bottle, battery, medicine, thermocol)"),
    lat: Optional[float] = Query(None, description="User latitude for nearest facility ranking"),
    lon: Optional[float] = Query(None, description="User longitude for nearest facility ranking"),
    db: Session = Depends(get_db)
) -> Any:
    cleaned_query = q.lower().strip()
    all_items = db.query(WasteItem).all()

    query_tokens = [t for t in cleaned_query.split() if len(t) > 1]
    expanded_tokens = set(query_tokens)
    for token in query_tokens:
        if token in SYNONYM_MAP:
            expanded_tokens.update(SYNONYM_MAP[token])

    scored_items: List[Tuple[WasteItem, float]] = []

    for item in all_items:
        name_lower = item.name.lower()
        aliases_lower = [a.lower() for a in item.aliases]
        name_tokens = set(name_lower.replace("(", " ").replace(")", " ").replace("/", " ").replace("-", " ").split())
        
        score = 0.0

        # 1. Exact match on name
        if name_lower == cleaned_query:
            score = 100.0
        # 2. Exact match in aliases
        elif cleaned_query in aliases_lower:
            score = 92.0
        # 3. Substring match in name
        elif cleaned_query in name_lower:
            score = 85.0
        # 4. Substring match in alias
        elif any(cleaned_query in a for a in aliases_lower):
            score = 80.0
        else:
            # 5. Token overlap and synonym expansion matching
            overlap = expanded_tokens.intersection(name_tokens)
            if overlap:
                score = 55.0 + (len(overlap) * 15.0)
            else:
                for a in aliases_lower:
                    a_tokens = set(a.replace("-", " ").split())
                    a_overlap = expanded_tokens.intersection(a_tokens)
                    if a_overlap:
                        score = max(score, 50.0 + (len(a_overlap) * 12.0))

            # 6. Typo tolerance: Levenshtein distance check on key tokens
            if score == 0.0:
                for q_tok in query_tokens:
                    if len(q_tok) >= 4:
                        for n_tok in name_tokens:
                            if len(n_tok) >= 4:
                                dist = levenshtein_distance(q_tok, n_tok)
                                if dist <= 1:
                                    score = max(score, 70.0)
                                elif dist <= 2 and (len(q_tok) >= 5 or len(n_tok) >= 5):
                                    score = max(score, 60.0)

        if score >= 40.0:
            scored_items.append((item, score))

    # Sort items by relevance score descending
    scored_items.sort(key=lambda x: x[1], reverse=True)
    all_matches = [item for item, _ in scored_items][:12]
    matched_item = all_matches[0] if all_matches else None

    # Fallback to closest partial match if no high-confidence result
    if not matched_item and all_items:
        for item in all_items:
            for q_tok in query_tokens:
                if len(q_tok) >= 3 and q_tok in item.name.lower():
                    matched_item = item
                    all_matches.append(item)
                    break
            if matched_item:
                break

    # Resolve nearest facilities
    nearest_facilities = []
    if matched_item:
        cat = db.query(LocationCategory).filter(
            LocationCategory.code == matched_item.target_facility_code.lower()
        ).first()

        loc_query = db.query(Location).filter(Location.is_active == True)
        if cat:
            loc_query = loc_query.filter(Location.category_id == cat.id)

        locations = loc_query.all()
        if lat is not None and lon is not None:
            nearest_facilities = filter_and_rank_by_proximity(locations, lat, lon)[:5]
        else:
            for loc in locations:
                loc.directions_url = generate_directions_url(loc.latitude, loc.longitude)
            nearest_facilities = locations[:5]

    return {
        "query": q,
        "matched_item": matched_item,
        "all_matching_items": all_matches,
        "nearest_facilities": nearest_facilities
    }


@router.get("/items", response_model=List[WasteItemOut])
def list_all_waste_items(
    category: Optional[str] = Query(None),
    bin_type: Optional[str] = Query(None),
    db: Session = Depends(get_db)
) -> Any:
    query = db.query(WasteItem)
    if category:
        query = query.filter(WasteItem.category.ilike(category))
    if bin_type:
        query = query.filter(WasteItem.segregation_bin.ilike(f"%{bin_type}%"))
    return query.order_by(WasteItem.name.asc()).all()
