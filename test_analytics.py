
import sys
import os
from pathlib import Path

# Add project root to sys.path
root = Path(__file__).resolve().parent
if str(root) not in sys.path:
    sys.path.insert(0, str(root))

from backend.database.db import SessionLocal
from backend.database.models import User, Policy, RiskPrediction
from backend.routers.analytics import geo_heatmap

db = SessionLocal()
user = db.query(User).first()
if not user:
    print("No user found")
    sys.exit(0)

try:
    print(f"Testing geo_heatmap for user: {user.email} ({user.id})")
    # Simulation of fastapi dependency call
    # We ignore the Depends parts and just call it.
    res = geo_heatmap(db=db, user=user)
    print("SUCCESS")
    print(res[:2])
except Exception as e:
    import traceback
    print("FAILED")
    print(traceback.format_exc())
finally:
    db.close()
