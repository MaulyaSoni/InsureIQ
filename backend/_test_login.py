import json
import requests

URL = "http://127.0.0.1:8000/api/auth/login"

cases = [
    {"email": "ab@gmail.com", "password": "wrongpass123"},
    {"email": "ab@gmail.com", "password": "123456"},
    {"email": "t1@test.com", "password": "test1234"},
    {"email": "demo@insureiq.local", "password": "demo1234"},
]

for c in cases:
    try:
        r = requests.post(URL, json=c, timeout=20)
        print(c["email"], r.status_code, r.text[:300])
    except Exception as e:
        print(c["email"], "ERR", str(e))
