import os
os.environ['DATABASE_URL'] = 'sqlite:///d:/InsureIQ/insureiq.db'
import sys; sys.path.insert(0, 'd:/InsureIQ')
from backend.database.db import SessionLocal
from backend.database.models import Policy, RiskPrediction, User
from sqlalchemy import func

db = SessionLocal()
out = []
demo_user = db.query(User).filter(User.email == 'demo@insureiq.local').first()
out.append(f"Demo user: {demo_user is not None}")
if demo_user:
    pc = db.query(Policy).filter(Policy.user_id == demo_user.id).count()
    rc = db.query(RiskPrediction).filter(RiskPrediction.user_id == demo_user.id).count()
    out.append(f"Policies={pc}, Predictions={rc}")
    dist = db.query(RiskPrediction.risk_band, func.count()).filter(RiskPrediction.user_id == demo_user.id).group_by(RiskPrediction.risk_band).all()
    for d in dist: out.append(f"  {d[0].value}: {d[1]}")
    s = db.query(Policy).filter(Policy.user_id == demo_user.id).limit(2).all()
    for p in s: out.append(f"  {p.policyholder_name} | {p.vehicle_make} {p.vehicle_model}")
db.close()
open('d:/InsureIQ/backend/_r.txt','w').write('\n'.join(out))
