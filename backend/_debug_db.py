import sys
sys.path.insert(0, 'd:/InsureIQ')

from backend.database.db import SessionLocal, init_db
from backend.database.models import Policy, RiskPrediction, User

init_db()
db = SessionLocal()

with open('d:/InsureIQ/backend/_debug_out.txt', 'w') as f:
    all_users = db.query(User).all()
    f.write(f"All users: {len(all_users)}\n")
    for u in all_users:
        f.write(f"  - {u.email} (id={u.id[:8]})\n")

    all_policies = db.query(Policy).all()
    f.write(f"All policies: {len(all_policies)}\n")

    demo_user = db.query(User).filter(User.email == 'demo@insureiq.local').first()
    f.write(f"Demo user found: {demo_user is not None}\n")
    if demo_user:
        pol_count = db.query(Policy).filter(Policy.user_id == demo_user.id).count()
        pred_count = db.query(RiskPrediction).filter(RiskPrediction.user_id == demo_user.id).count()
        f.write(f"  Policies: {pol_count}, Predictions: {pred_count}\n")
    else:
        # Check if user was created with different email
        other_users = db.query(User).filter(User.email.like('%demo%')).all()
        f.write(f"Users with 'demo' in email: {len(other_users)}\n")
        for u in other_users:
            f.write(f"  - {u.email}\n")

db.close()
