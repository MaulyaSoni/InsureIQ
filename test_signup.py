import requests

try:
    resp = requests.post(
        "http://127.0.0.1:8000/auth/signup",
        json={
            "email": "testuser2@example.com",
            "full_name": "Test User",
            "password": "Password123!"
        }
    )
    print(resp.status_code)
    print(resp.json())
except Exception as e:
    print(f"Error: {e}")
