def test_rag_query_and_citations(client, citizen_token):
    # In-domain waste query
    res = client.post("/api/v1/chat/query", json={
        "query": "How should I dispose of old lithium batteries according to rules?"
    }, headers={"Authorization": f"Bearer {citizen_token}"})
    assert res.status_code == 200
    data = res.json()
    assert len(data["answer"]) > 50
    assert len(data["citations"]) > 0
    assert data["session_id"] is not None
    # Citations must reference policy or awareness guide
    first_cit = data["citations"][0]
    assert "title" in first_cit
    assert "relevance_score" in first_cit
    assert first_cit["relevance_score"] > 0

    # Follow-up query in same session
    res_followup = client.post("/api/v1/chat/query", json={
        "query": "Where can I drop them off?",
        "session_id": data["session_id"]
    }, headers={"Authorization": f"Bearer {citizen_token}"})
    assert res_followup.status_code == 200
    assert res_followup.json()["session_id"] == data["session_id"]

    # Verify session retrieval
    sessions_res = client.get("/api/v1/chat/sessions", headers={"Authorization": f"Bearer {citizen_token}"})
    assert sessions_res.status_code == 200
    assert any(s["id"] == data["session_id"] for s in sessions_res.json())


def test_rag_guardrails_out_of_domain(client):
    # Completely off-topic query should be rejected by the domain guardrail
    res = client.post("/api/v1/chat/query", json={
        "query": "Can you write an essay about Shakespeare's Hamlet?"
    })
    assert res.status_code == 200
    data = res.json()
    assert "Smart Waste Management" in data["answer"]
    assert len(data["citations"]) == 0
    assert len(data["suggested_followups"]) > 0
