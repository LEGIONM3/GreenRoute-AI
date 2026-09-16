import urllib.request
import json

BASE_URL = "http://127.0.0.1:8000/api/v1"

def post_json(endpoint, data, headers=None):
    req_headers = {"Content-Type": "application/json"}
    if headers:
        req_headers.update(headers)
    req = urllib.request.Request(
        f"{BASE_URL}{endpoint}",
        data=json.dumps(data).encode("utf-8"),
        headers=req_headers,
        method="POST"
    )
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))

def get_json(endpoint, headers=None):
    req_headers = {}
    if headers:
        req_headers.update(headers)
    req = urllib.request.Request(
        f"{BASE_URL}{endpoint}",
        headers=req_headers,
        method="GET"
    )
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))

def run_tests():
    print("--- 1. Testing Admin Authentication (Argon2) ---")
    auth_data = post_json("/auth/login", {
        "email": "admin@wastecare.gov",
        "password": "Admin@123456"
    })
    token = auth_data["access_token"]
    print(f"Login success! Access token length: {len(token)}, refresh_token length: {len(auth_data['refresh_token'])}")

    auth_header = {"Authorization": f"Bearer {token}"}

    print("\n--- 2. Testing /auth/me Profile and RBAC ---")
    me = get_json("/auth/me", auth_header)
    print(f"User: {me['full_name']}, Role: {me['role']['name']}, Score: {me.get('environmental_score')}")

    print("\n--- 3. Testing Admin Metrics ---")
    metrics = get_json("/admin/metrics", auth_header)
    print(f"Total Users: {metrics['total_users']}, Locations: {metrics['total_locations']}, Reports: {metrics['total_reports']}, Resolution Rate: {metrics['resolution_rate_pct']}%")

    print("\n--- 4. Testing RBAC Roles & Permissions Matrix ---")
    roles = get_json("/admin/roles", auth_header)
    print(f"Loaded {len(roles)} roles:")
    for r in roles:
        print(f"  - {r['name']}: {len(r.get('permissions', []))} permissions")

    print("\n--- 5. Testing Knowledge Documents ---")
    kdocs_resp = get_json("/knowledge/documents", auth_header)
    kdocs = kdocs_resp.get("items", []) if isinstance(kdocs_resp, dict) else kdocs_resp
    print(f"Loaded {len(kdocs)} knowledge documents:")
    for d in kdocs:
        print(f"  - {d['title']} ({d.get('source_type') or d.get('file_type')}, {d['chunk_count']} chunks)")

    print("\n--- 6. Testing Groq RAG Chat Query ---")
    chat_res = post_json("/chat/query", {
        "query": "How should I dispose of lead-acid batteries safely?",
        "latitude": 12.9716,
        "longitude": 77.5946
    }, auth_header)
    print(f"Confidence Score: {chat_res.get('confidence_score')}")
    print(f"Model Used: {chat_res.get('model_used')}")
    print(f"Answer excerpt: {chat_res['answer'][:120]}...")
    print(f"Citations count: {len(chat_res.get('citations', []))}")
    print(f"Related locations count: {len(chat_res.get('related_locations', []))}")

    print("\n--- 7. Testing Frontend Response ---")
    req = urllib.request.Request("http://127.0.0.1:3000/")
    with urllib.request.urlopen(req) as resp:
        print(f"Frontend HTTP Status: {resp.status} (OK)")

    print("\nALL SYSTEM TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    run_tests()
