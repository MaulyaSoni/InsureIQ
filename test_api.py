import requests

BASE_URL = "http://127.0.0.1:8000"

# Test health endpoint
try:
    resp = requests.get(f"{BASE_URL}/health", timeout=5)
    print(f"Health: {resp.status_code} - {resp.json()}")
except Exception as e:
    print(f"Health check failed: {e}")

# Test signup to get a token
try:
    resp = requests.post(
        f"{BASE_URL}/auth/signup",
        json={
            "email": "test_user_check@example.com",
            "full_name": "Test User Check",
            "password": "TestPass123!"
        },
        timeout=5
    )
    print(f"Signup: {resp.status_code}")
    if resp.status_code == 200:
        data = resp.json()
        token = data.get("access_token")
        print(f"Token received: {token[:20]}...")

        # Test /policies with auth
        headers = {"Authorization": f"Bearer {token}"}
        resp2 = requests.get(f"{BASE_URL}/policies", headers=headers, timeout=5)
        print(f"GET /policies: {resp2.status_code}")
        if resp2.status_code == 200:
            policies_data = resp2.json()
            print(f"  Total policies: {policies_data.get('total', 'N/A')}")
            print(f"  Policies returned: {len(policies_data.get('policies', []))}")
        else:
            print(f"  Error: {resp2.text[:200]}")
    else:
        print(f"  Error: {resp.text[:200]}")
except Exception as e:
    print(f"API test failed: {e}")
