import os, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
_db_url = f"sqlite:///{Path(__file__).resolve().parents[1] / 'insureiq.db'}"
os.environ["DATABASE_URL"] = _db_url
from backend.database.db import SessionLocal
from backend.database.models import Policy, RiskPrediction, User
db = SessionLocal()
out = []
all_u = db.query(User).all()
out.append(f"Users: {len(all_u)}")
for u in all_u: out.append(f"  {u.email}")
user = db.query(User).filter(User.email == "demo@insureiq.local").first()
out.append(f"Demo user: {user is not None}")
if not user:
    user = User(
        id=str(uuid.uuid4()),
        email="demo@insureiq.local",
        full_name="Demo User",
        hashed_password=hash_password("demo1234"),
        is_active=True,
        created_at=datetime.utcnow(),
        last_login=None,
    )
    import uuid as _uuid
    from datetime import datetime as _dt
    from backend.auth.password import hash_password
    db.add(user); db.commit(); db.refresh(user)
    out.append(f"Created demo user: {user.email}")
db.close()
open('d:/InsureIQ/backend/_r.txt','w').write('\n'.join(out))
