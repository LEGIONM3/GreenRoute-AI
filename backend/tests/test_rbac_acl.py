def test_rbac_roles_and_permissions(client, admin_token):
    # 1. List roles
    roles_res = client.get("/api/v1/admin/roles", headers={"Authorization": f"Bearer {admin_token}"})
    assert roles_res.status_code == 200
    roles = roles_res.json()
    role_names = [r["name"] for r in roles]
    assert "SuperAdmin" in role_names
    assert "Admin" in role_names
    assert "MunicipalOperator" in role_names
    assert "ContentManager" in role_names
    assert "Citizen" in role_names

    # 2. List permissions grouped
    perms_res = client.get("/api/v1/admin/permissions", headers={"Authorization": f"Bearer {admin_token}"})
    assert perms_res.status_code == 200
    perms_grouped = perms_res.json()
    assert "locations" in perms_grouped
    assert "reports" in perms_grouped
    assert "policies" in perms_grouped
    assert "knowledge" in perms_grouped


def test_acl_citizen_denied_admin(client, citizen_token):
    # Citizen must be forbidden from accessing admin suite
    admin_metrics = client.get("/api/v1/admin/metrics", headers={"Authorization": f"Bearer {citizen_token}"})
    assert admin_metrics.status_code == 403

    admin_users = client.get("/api/v1/admin/users", headers={"Authorization": f"Bearer {citizen_token}"})
    assert admin_users.status_code == 403


def test_municipal_scoping_and_audit_logs(client, admin_token):
    # 1. Municipalities listing
    muns_res = client.get("/api/v1/admin/municipalities", headers={"Authorization": f"Bearer {admin_token}"})
    assert muns_res.status_code == 200
    muns = muns_res.json()
    codes = [m["code"] for m in muns]
    assert "GHMC" in codes

    # 2. Audit logs
    audit_res = client.get("/api/v1/admin/audit-logs", headers={"Authorization": f"Bearer {admin_token}"})
    assert audit_res.status_code == 200
    assert "items" in audit_res.json()
    assert audit_res.json()["total"] >= 1


def test_user_status_and_role_management(client, admin_token):
    # 1. List users
    users_res = client.get("/api/v1/admin/users", headers={"Authorization": f"Bearer {admin_token}"})
    assert users_res.status_code == 200
    users = users_res.json()
    citizen_user = next(u for u in users if u["email"] == "citizen@wastecare.gov")

    # 2. Update status to Suspended and back to Active
    stat_res = client.patch(f"/api/v1/admin/users/{citizen_user['id']}/status", headers={"Authorization": f"Bearer {admin_token}"}, json={
        "status": "Suspended"
    })
    assert stat_res.status_code == 200

    # Suspended user cannot login
    sus_login = client.post("/api/v1/auth/login", json={
        "email": "citizen@wastecare.gov",
        "password": "Citizen@123456"
    })
    assert sus_login.status_code == 403

    # Restore Active status
    restore_res = client.patch(f"/api/v1/admin/users/{citizen_user['id']}/status", headers={"Authorization": f"Bearer {admin_token}"}, json={
        "status": "Active"
    })
    assert restore_res.status_code == 200

