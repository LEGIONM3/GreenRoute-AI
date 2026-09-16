def test_reports_lifecycle(client, citizen_token, admin_token):
    # 1. Citizen creates report
    create_res = client.post("/api/v1/reports", json={
        "category": "Overflowing Bin",
        "description": "Bin overflowing next to market gate",
        "latitude": 12.9500,
        "longitude": 77.6000,
        "address": "Market Road, Bengaluru"
    }, headers={"Authorization": f"Bearer {citizen_token}"})
    assert create_res.status_code == 201
    report_id = create_res.json()["id"]
    assert create_res.json()["status"] == "Open"

    # 2. Citizen lists own reports
    list_res = client.get("/api/v1/reports", headers={"Authorization": f"Bearer {citizen_token}"})
    assert list_res.status_code == 200
    assert any(r["id"] == report_id for r in list_res.json())

    # 3. Admin updates status to In Progress
    patch_res = client.patch(f"/api/v1/reports/{report_id}", json={
        "status": "In Progress",
        "admin_notes": "Crew dispatched"
    }, headers={"Authorization": f"Bearer {admin_token}"})
    assert patch_res.status_code == 200
    assert patch_res.json()["status"] == "In Progress"
    assert patch_res.json()["admin_notes"] == "Crew dispatched"

    # 4. Admin marks as Resolved
    resolve_res = client.patch(f"/api/v1/reports/{report_id}", json={
        "status": "Resolved",
        "admin_notes": "Waste cleared completely"
    }, headers={"Authorization": f"Bearer {admin_token}"})
    assert resolve_res.status_code == 200
    assert resolve_res.json()["status"] == "Resolved"
    assert resolve_res.json()["resolved_by_id"] is not None
