import os, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
_db_url = f"sqlite:///{Path(__file__).resolve().parents[1] / 'insureiq.db'}"
os.environ["DATABASE_URL"] = _db_url

from backend.database.db import SessionLocal
from backend.database.models import Policy, RiskPrediction, User
from sqlalchemy import func

db = SessionLocal()
lines = []
demo = db.query(User).filter(User.email == "demo@insureiq.local").first()
lines.append(f"Demo user exists: {demo is not None}")
if demo:
    pc = db.query(Policy).filter(Policy.user_id == demo.id).count()
    rc = db.query(RiskPrediction).filter(RiskPrediction.user_id == demo.id).count()
    lines.append(f"Policies={pc}, Predictions={rc}")
    dist = db.query(
        RiskPrediction.risk_band,
        func.count(RiskPrediction.id)
    ).filter(
        RiskPrediction.user_id == demo.id
    ).group_by(RiskPrediction.risk_band).all()
    total = sum(d[1] for d in dist)
    for band, cnt in dist:
        pct = round(cnt/total*100, 1) if total else 0
        lines.append(f"  {band.value}: {cnt} ({pct}%)")
    samples = db.query(Policy).filter(Policy.user_id == demo.id).limit(3).all()
    for p in samples:
        lines.append(f"  {p.policyholder_name} | {p.vehicle_make} {p.vehicle_model} | {p.city} | Rs.{p.insured_value:,.0f}")
db.close()
open('d:/InsureIQ/backend/_result.txt', 'w').write('\n'.join(lines))
