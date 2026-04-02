import os
os.environ['DATABASE_URL'] = 'sqlite:///d:/InsureIQ/insureiq.db'

import sys
sys.path.insert(0, 'd:/InsureIQ')

from backend.database.db import SessionLocal
from backend.database.models import Policy, RiskPrediction, User
from sqlalchemy import func

db = SessionLocal()

out = []
all_users = db.query(User).all()
out.append(f"All users: {len(all_users)}")
for u in all_users:
    out.append(f"  - {u.email}")

demo_user = db.query(User).filter(User.email == 'demo@insureiq.local').first()
out.append(f"Demo user found: {demo_user is not None}")

if demo_user:
    pol_count = db.query(Policy).filter(Policy.user_id == demo_user.id).count()
    pred_count = db.query(RiskPrediction).filter(RiskPrediction.user_id == demo_user.id).count()
    out.append(f"Policies: {pol_count}, Predictions: {pred_count}")

    dist = (
        db.query(RiskPrediction.risk_band, func.count(RiskPrediction.id))
        .filter(RiskPrediction.user_id == demo_user.id)
        .group_by(RiskPrediction.risk_band)
        .all()
    )
    out.append("Risk distribution:")
    total = sum(x[1] for x in dist)
    for band, count in dist:
        pct = round(count / total * 100, 1) if total > 0 else 0
        out.append(f"  {band.value}: {count} ({pct}%)")

    sample = db.query(Policy).filter(Policy.user_id == demo_user.id).limit(3).all()
    out.append("Sample policies:")
    for p in sample:
        out.append(f"  - {p.policyholder_name} | {p.vehicle_make} {p.vehicle_model} | {p.city} | {p.insured_value:,.0f}")

db.close()

with open('d:/InsureIQ/backend/_seed_result.txt', 'w') as f:
    f.write('\n'.join(out))
