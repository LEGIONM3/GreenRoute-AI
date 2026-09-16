def test_register_and_login(client):
    reg_res = client.post("/api/v1/auth/register", json={
        "email": "tester@domain.com",
        "password": "password123",
        "full_name": "Test Citizen",
        "phone": "+91 99999 88888"
    })
    assert reg_res.status_code == 201
    assert reg_res.json()["email"] == "tester@domain.com"
    assert reg_res.json()["role"]["name"] == "Citizen"

    # Duplicate registration should fail
    dup_res = client.post("/api/v1/auth/register", json={
        "email": "tester@domain.com",
        "password": "password123",
        "full_name": "Test Citizen"
    })
    assert dup_res.status_code == 400

    # Successful login
    login_res = client.post("/api/v1/auth/login", json={
        "email": "tester@domain.com",
        "password": "password123"
    })
    assert login_res.status_code == 200
    token_data = login_res.json()
    assert "access_token" in token_data
    assert "refresh_token" in token_data

    # Invalid password login
    bad_login = client.post("/api/v1/auth/login", json={
        "email": "tester@domain.com",
        "password": "wrongpassword"
    })
    assert bad_login.status_code == 401

    # Get current user
    me_res = client.get("/api/v1/auth/me", headers={
        "Authorization": f"Bearer {token_data['access_token']}"
    })
    assert me_res.status_code == 200
    assert me_res.json()["email"] == "tester@domain.com"


def test_refresh_token(client):
    login_res = client.post("/api/v1/auth/login", json={
        "email": "admin@wastecare.gov",
        "password": "Admin@123456"
    })
    refresh_token = login_res.json()["refresh_token"]

    refresh_res = client.post(f"/api/v1/auth/refresh?refresh_token={refresh_token}")
    assert refresh_res.status_code == 200
    assert "access_token" in refresh_res.json()
