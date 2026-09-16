import io
import os
import pytest
from app.services.document_parser import extract_text_from_file, chunk_text
from app.core.deps import check_resource_ownership_or_admin
from app.models.user import User
from app.models.role import Role


def test_document_parser_formats(tmp_path):
    # 1. Plain text / markdown
    txt_file = tmp_path / "sample.txt"
    txt_file.write_text("Header\n\nContent paragraph 1\n\nContent paragraph 2", encoding="utf-8")
    extracted = extract_text_from_file(str(txt_file), "sample.txt")
    assert "Content paragraph" in extracted

    # 2. Chunk text with custom parameters
    chunks = chunk_text(extracted, chunk_size=30, chunk_overlap=10)
    assert len(chunks) >= 1

    # 3. Non-utf-8 fallback
    latin_file = tmp_path / "latin.txt"
    latin_file.write_bytes(b"Hello world")
    extracted_latin = extract_text_from_file(str(latin_file), "latin.txt")
    assert "Hello" in extracted_latin


def test_resource_ownership_acl_logic():
    admin_user = User(id="admin-1", full_name="Admin")
    admin_user.role = Role(name="Admin")

    citizen_user = User(id="citizen-1", full_name="Citizen")
    citizen_user.role = Role(name="Citizen")

    operator_user = User(id="operator-1", full_name="Operator", municipality_id="mun-1")
    operator_user.role = Role(name="MunicipalOperator")

    # Admin owns everything
    assert check_resource_ownership_or_admin(admin_user, "other-user-id") is True

    # Citizen owns own resource
    assert check_resource_ownership_or_admin(citizen_user, "citizen-1") is True
    assert check_resource_ownership_or_admin(citizen_user, "other-user") is False

    # Operator owns within municipality
    assert check_resource_ownership_or_admin(operator_user, "other-user", resource_municipality_id="mun-1") is True
    assert check_resource_ownership_or_admin(operator_user, "other-user", resource_municipality_id="mun-2") is False


def test_admin_settings_and_roles(client, admin_token):
    # 1. GET & PUT settings
    get_set = client.get("/api/v1/admin/settings", headers={"Authorization": f"Bearer {admin_token}"})
    assert get_set.status_code == 200
    assert "llm_provider" in get_set.json()

    put_set = client.put("/api/v1/admin/settings", headers={"Authorization": f"Bearer {admin_token}"}, json={
        "groq_model": "qwen/qwen3.8-27b",
        "access_token_expire_minutes": 15
    })
    assert put_set.status_code == 200

    # 2. Roles permission update
    roles = client.get("/api/v1/admin/roles", headers={"Authorization": f"Bearer {admin_token}"}).json()
    content_mgr = next(r for r in roles if r["name"] == "ContentManager")
    
    # Get a permission id
    perms_grouped = client.get("/api/v1/admin/permissions", headers={"Authorization": f"Bearer {admin_token}"}).json()
    first_perm_id = perms_grouped["locations"][0]["id"]

    update_perms = client.post(
        f"/api/v1/admin/roles/{content_mgr['id']}/permissions",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"permission_ids": [first_perm_id]}
    )
    assert update_perms.status_code == 200

    # 3. Create municipality
    create_mun = client.post("/api/v1/admin/municipalities", headers={"Authorization": f"Bearer {admin_token}"}, json={
        "name": "Pune Municipal Corporation",
        "code": "PMC",
        "state": "Maharashtra"
    })
    assert create_mun.status_code == 200
    assert create_mun.json()["code"] == "PMC"


def test_policies_crud(client, admin_token):
    # Create policy
    create_res = client.post("/api/v1/policies", headers={"Authorization": f"Bearer {admin_token}"}, json={
        "title": "National Battery Handling Directives 2026",
        "summary": "Mandatory EPR collection for EV and consumer lithium batteries",
        "category": "E-Waste",
        "authority": "CPCB India",
        "full_text": "All retail outlets selling batteries must establish take-back points."
    })
    assert create_res.status_code == 201
    pol_id = create_res.json()["id"]

    # Read policy
    get_res = client.get(f"/api/v1/policies/{pol_id}")
    assert get_res.status_code == 200
    assert get_res.json()["title"] == "National Battery Handling Directives 2026"


def test_articles_crud(client, admin_token):
    # Create article
    create_res = client.post("/api/v1/articles", headers={"Authorization": f"Bearer {admin_token}"}, json={
        "title": "Home Composting Masterclass",
        "slug": "home-composting-masterclass",
        "summary": "Turn kitchen food scraps into rich organic compost",
        "category": "Composting",
        "content": "Layer brown matter (dry leaves) and green matter (vegetable peels) in a 2:1 ratio."
    })
    assert create_res.status_code == 201
    art_id = create_res.json()["id"]

    # Read article by slug
    art_slug = create_res.json()["slug"]
    get_res = client.get(f"/api/v1/articles/{art_slug}")
    assert get_res.status_code == 200

