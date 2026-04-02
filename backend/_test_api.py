import os, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
_db = f"sqlite:///{Path(__file__).resolve().parents[1] / 'insureiq.db'}"
os.environ["DATABASE_URL"] = _db

from backend.seed_data import seed_db

out_lines = []
import io, contextlib

# Capture print output
f = io.StringIO()
with contextlib.redirect_stdout(f):
    seed_db()
seed_output = f.getvalue()

out_lines.append("=== SEED OUTPUT ===")
out_lines.append(seed_output)

# Now test API
try:
    from fastapi.testclient import TestClient
    from backend.main import app
    client = TestClient(app)

    r = client.get("/health")
    out_lines.append(f"\nGET /health: {r.status_code} -> {r.json()}")

    r = client.post("/api/auth/login", json={"email": "demo@insureiq.com", "password": "demo1234"})
    out_lines.append(f"POST /api/auth/login: {r.status_code}")
    if r.status_code == 200:
        token = r.json().get("access_token")
        out_lines.append(f"  Token: {str(token)[:30]}...")
        headers = {"Authorization": f"Bearer {token}"}
        r = client.get("/api/policies", headers=headers)
        out_lines.append(f"GET /api/policies: {r.status_code}")
        if r.status_code == 200:
            data = r.json()
            items = data.get("items", data.get("policies", []))
            out_lines.append(f"  Items: {len(items)}, total: {data.get('total', 'N/A')}")
            if items:
                out_lines.append(f"  First: {items[0].get('policyholder_name')} | {items[0].get('vehicle_make')}")
        else:
            out_lines.append(f"  Response: {r.text[:300]}")
    else:
        out_lines.append(f"  Response: {r.text[:300]}")
except Exception as e:
    import traceback
    out_lines.append(f"ERROR: {e}")
    out_lines.append(traceback.format_exc()[:500])

result = '\n'.join(out_lines)
open('d:/InsureIQ/backend/_api_result.txt', 'w').write(result)
print(result)
