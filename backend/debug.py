from fastapi.testclient import TestClient
from backend.main import app
from backend.database.db import SessionLocal
from backend.database.models import User, Policy
from backend.auth import create_access_token

client = TestClient(app)

db = SessionLocal()
p = db.query(Policy).first()
if not p:
    print("No policies")
    exit()

u = db.query(User).first()
tok = create_access_token(u.id, u.email)
headers = {"Authorization": f"Bearer {tok}"}

res = client.post("/api/risk-scoring", json={"policy_id": p.id}, headers=headers)
print("RISK:")
print(res.status_code)
print(res.text)

res2 = client.post("/api/report", json={"policy_id": p.id}, headers=headers)
print("REPORT:")
print(res2.status_code)
print(res2.text)
