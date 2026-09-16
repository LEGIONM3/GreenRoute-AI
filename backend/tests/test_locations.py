def test_list_locations_and_categories(client):
    cat_res = client.get("/api/v1/locations/categories")
    assert cat_res.status_code == 200
    categories = cat_res.json()
    assert len(categories) >= 4
    cat_codes = [c["code"] for c in categories]
    assert "dustbin" in cat_codes
    assert "recycling" in cat_codes
    assert "e_waste" in cat_codes
    assert "hazardous" in cat_codes

    # List all locations
    loc_res = client.get("/api/v1/locations")
    assert loc_res.status_code == 200
    assert len(loc_res.json()) >= 8

    # Filter by category
    e_waste_res = client.get("/api/v1/locations?category_code=e_waste")
    assert e_waste_res.status_code == 200
    for loc in e_waste_res.json():
        assert loc["category"]["code"] == "e_waste"

    # Filter by proximity
    prox_res = client.get("/api/v1/locations?lat=12.9716&lon=77.5946&radius_km=10")
    assert prox_res.status_code == 200
    locations = prox_res.json()
    assert len(locations) > 0
    # First item should be nearest
    assert locations[0]["distance_km"] <= locations[-1]["distance_km"]


def test_location_crud(client, admin_token, citizen_token):
    cat_id = client.get("/api/v1/locations/categories").json()[0]["id"]

    # Citizen creates location (is_verified = False)
    create_res = client.post("/api/v1/locations", json={
        "name": "Community Bin Proposal",
        "description": "Proposed new dual bin outside park gate",
        "category_id": cat_id,
        "latitude": 12.9800,
        "longitude": 77.6000,
        "address": "Park Avenue",
        "city": "Bengaluru",
        "postal_code": "560001",
        "accepted_waste_types": ["Plastic", "Organic"],
        "operating_hours": {"Mon-Sun": "24 Hours"}
    }, headers={"Authorization": f"Bearer {citizen_token}"})
    assert create_res.status_code == 201
    loc_id = create_res.json()["id"]
    assert create_res.json()["is_verified"] is False

    # Admin updates location to verified
    update_res = client.put(f"/api/v1/locations/{loc_id}", json={
        "is_verified": True,
        "name": "Approved Community Bin"
    }, headers={"Authorization": f"Bearer {admin_token}"})
    assert update_res.status_code == 200
    assert update_res.json()["is_verified"] is True
    assert update_res.json()["name"] == "Approved Community Bin"

    # Admin soft deletes location
    del_res = client.delete(f"/api/v1/locations/{loc_id}", headers={
        "Authorization": f"Bearer {admin_token}"
    })
    assert del_res.status_code == 204

    # Deleted location should no longer appear in active list
    get_res = client.get(f"/api/v1/locations/{loc_id}")
    assert get_res.status_code == 404
