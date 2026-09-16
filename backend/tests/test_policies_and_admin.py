def test_policies_and_articles(client, admin_token):
    # List policies
    pol_res = client.get("/api/v1/policies")
    assert pol_res.status_code == 200
    assert len(pol_res.json()) >= 5

    # Filter by category
    solid_res = client.get("/api/v1/policies?category=Solid Waste")
    assert solid_res.status_code == 200
    assert len(solid_res.json()) >= 1
    assert "Solid Waste" in solid_res.json()[0]["category"]

    # List articles
    art_res = client.get("/api/v1/articles")
    assert art_res.status_code == 200
    assert len(art_res.json()) >= 4
    first_slug = art_res.json()[0]["slug"]

    # Read single article by slug
    art_detail = client.get(f"/api/v1/articles/{first_slug}")
    assert art_detail.status_code == 200
    assert art_detail.json()["slug"] == first_slug
    assert art_detail.json()["views_count"] >= 1


def test_admin_metrics_and_user_mgmt(client, admin_token, citizen_token):
    # Non-admin forbidden
    metrics_forbidden = client.get("/api/v1/admin/metrics", headers={"Authorization": f"Bearer {citizen_token}"})
    assert metrics_forbidden.status_code == 403

    # Admin access
    metrics_res = client.get("/api/v1/admin/metrics", headers={"Authorization": f"Bearer {admin_token}"})
    assert metrics_res.status_code == 200
    m = metrics_res.json()
    assert m["total_locations"] >= 8
    assert m["total_policies"] >= 5
    assert m["total_articles"] >= 4
    assert "resolution_rate_pct" in m

    # List users
    users_res = client.get("/api/v1/admin/users", headers={"Authorization": f"Bearer {admin_token}"})
    assert users_res.status_code == 200
    assert len(users_res.json()) >= 2
