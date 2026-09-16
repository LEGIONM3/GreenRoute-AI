import io


def test_csv_bulk_import_locations(client, admin_token):
    csv_content = (
        "name,category_code,latitude,longitude,address,city,accepted_waste_types,operating_hours\n"
        "Jubilee Hills Hub,recycling,17.4319,78.4073,Road No 36,Hyderabad,Paper;Plastics,09:00 AM - 05:00 PM\n"
        "Banjara Hills Smart Bin,dustbin,17.4156,78.4350,Road No 1,Hyderabad,Wet Waste;Dry Waste,24 Hours\n"
    )
    file_tuple = ("facilities.csv", io.BytesIO(csv_content.encode("utf-8")), "text/csv")
    res = client.post(
        "/api/v1/locations/bulk-import",
        headers={"Authorization": f"Bearer {admin_token}"},
        files={"file": file_tuple}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["imported_count"] == 2


def test_knowledge_document_upload_and_list(client, admin_token):
    # 1. Upload a markdown guide
    doc_content = (
        "# GHMC Plastic Ban Directive 2026\n\n"
        "Single-use plastics under 120 microns are strictly prohibited across municipal boundaries.\n\n"
        "Violations incur a fine of Rs 5,000 for commercial establishments and Rs 500 for households.\n\n"
        "Residents must hand over non-recyclable multi-layered packaging to authorized dry resource collection centers."
    )
    file_tuple = ("ghmc_plastic_directive.md", io.BytesIO(doc_content.encode("utf-8")), "text/markdown")
    res = client.post(
        "/api/v1/knowledge/upload",
        headers={"Authorization": f"Bearer {admin_token}"},
        files={"file": file_tuple},
        data={"title": "GHMC Plastic Ban Directive 2026", "category": "Municipal Directive"}
    )
    assert res.status_code == 200
    doc_data = res.json()
    assert doc_data["title"] == "GHMC Plastic Ban Directive 2026"
    assert doc_data["chunk_count"] >= 1
    doc_id = doc_data["id"]

    # 2. List documents
    list_res = client.get("/api/v1/knowledge/documents")
    assert list_res.status_code == 200
    docs = list_res.json()["items"]
    assert any(d["id"] == doc_id for d in docs)

    # 3. Delete document
    del_res = client.delete(f"/api/v1/knowledge/documents/{doc_id}", headers={"Authorization": f"Bearer {admin_token}"})
    assert del_res.status_code == 204


def test_chat_query_enhanced_rag(client):
    # Test enhanced query returning confidence_score, model_used, and locations
    res = client.post("/api/v1/chat/query", json={
        "query": "How do I dispose of expired medicines and syringes safely?",
        "latitude": 17.3850,
        "longitude": 78.4867
    })
    assert res.status_code == 200
    data = res.json()
    assert "answer" in data
    assert len(data["answer"]) > 20
    assert "confidence_score" in data
    assert data["confidence_score"] > 0.5
    assert "related_locations" in data
    assert "related_policies" in data


def test_chat_streaming(client):
    res = client.post("/api/v1/chat/stream", json={
        "query": "Which bin does kitchen vegetable waste go into?"
    })
    assert res.status_code == 200
    # Streaming response should contain SSE formatted text
    content = res.text
    assert "data:" in content

