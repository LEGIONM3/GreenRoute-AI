def test_waste_search_guidance(client):
    # Search for battery
    res = client.get("/api/v1/search/waste?q=battery&lat=12.9716&lon=77.5946")
    assert res.status_code == 200
    data = res.json()
    assert data["matched_item"] is not None
    assert "battery" in data["matched_item"]["name"].lower() or "battery" in str(data["matched_item"]["aliases"]).lower()
    assert len(data["nearest_facilities"]) > 0

    # Search for plastic bottle
    res_plastic = client.get("/api/v1/search/waste?q=plastic bottle&lat=12.9716&lon=77.5946")
    assert res_plastic.status_code == 200
    p_data = res_plastic.json()
    assert p_data["matched_item"] is not None
    assert "Dry (Blue)" in p_data["matched_item"]["segregation_bin"]

    # Search for non-existent item still returns valid format
    res_unknown = client.get("/api/v1/search/waste?q=quantum computer")
    assert res_unknown.status_code == 200
    assert res_unknown.json()["matched_item"] is None

    # List all waste items
    items_res = client.get("/api/v1/search/items")
    assert items_res.status_code == 200
    assert len(items_res.json()) >= 10
