import os
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
_db_url = f"sqlite:///{Path(__file__).resolve().parents[1] / 'insureiq.db'}"
os.environ["DATABASE_URL"] = _db_url

from backend.database.db import SessionLocal
from backend.database.models import Policy, RiskPrediction, User

db = SessionLocal()
user = db.query(User).filter(User.email == "demo@insureiq.local").first()
if user:
    db.query(RiskPrediction).filter(RiskPrediction.user_id == user.id).delete()
    db.query(Policy).filter(Policy.user_id == user.id).delete()
    db.commit()
    print(f"Cleared {user.email} data from {Path(__file__).resolve().parents[1] / 'insureiq.db'}")
else:
    print(f"No demo user in {Path(__file__).resolve().parents[1] / 'insureiq.db'}")
db.close()
