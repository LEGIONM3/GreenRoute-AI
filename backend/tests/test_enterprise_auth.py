def test_session_lifecycle_and_logout_all(client):
    # 1. Login to establish session
    login_res = client.post("/api/v1/auth/login", json={
        "email": "citizen@wastecare.gov",
        "password": "Citizen@123456"
    })
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    refresh_token = login_res.json()["refresh_token"]

    # 2. Check active sessions
    sess_res = client.get("/api/v1/auth/sessions", headers={"Authorization": f"Bearer {token}"})
    assert sess_res.status_code == 200
    sessions = sess_res.json()
    assert len(sessions) >= 1
    assert sessions[0]["is_revoked"] is False

    # 3. Test token rotation
    rot_res = client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_token})
    assert rot_res.status_code == 200
    new_refresh = rot_res.json()["refresh_token"]
    assert new_refresh != refresh_token

    # 4. Old refresh token should now be revoked and rejected
    rej_res = client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_token})
    assert rej_res.status_code == 401

    # 5. Logout all devices
    logout_all_res = client.post("/api/v1/auth/logout-all", headers={"Authorization": f"Bearer {token}"})
    assert logout_all_res.status_code == 200

    # 6. Verify all sessions are revoked
    sess_after = client.get("/api/v1/auth/sessions", headers={"Authorization": f"Bearer {token}"})
    for s in sess_after.json():
        assert s["is_revoked"] is True


def test_password_reset_and_email_verification(client):
    # 1. Request password reset
    req_res = client.post("/api/v1/auth/password-reset-request", json={
        "email": "citizen@wastecare.gov"
    })
    assert req_res.status_code == 200
    reset_token = req_res.json().get("reset_token")
    assert reset_token is not None

    # 2. Confirm password reset
    confirm_res = client.post("/api/v1/auth/password-reset-confirm", json={
        "token": reset_token,
        "new_password": "NewCitizenPassword@999"
    })
    assert confirm_res.status_code == 200

    # 3. Login with new password
    new_login = client.post("/api/v1/auth/login", json={
        "email": "citizen@wastecare.gov",
        "password": "NewCitizenPassword@999"
    })
    assert new_login.status_code == 200

    # 4. Reset back to original password for other tests
    revert_req = client.post("/api/v1/auth/password-reset-request", json={"email": "citizen@wastecare.gov"})
    revert_token = revert_req.json().get("reset_token")
    client.post("/api/v1/auth/password-reset-confirm", json={
        "token": revert_token,
        "new_password": "Citizen@123456"
    })


def test_profile_update_and_score(client, citizen_token):
    # 1. Update Profile
    update_res = client.put("/api/v1/auth/me", headers={"Authorization": f"Bearer {citizen_token}"}, json={
        "full_name": "Priya Sharma Updated",
        "phone": "+91 99887 76655"
    })
    assert update_res.status_code == 200
    assert update_res.json()["full_name"] == "Priya Sharma Updated"
    assert update_res.json()["phone"] == "+91 99887 76655"
    assert "environmental_score" in update_res.json()

