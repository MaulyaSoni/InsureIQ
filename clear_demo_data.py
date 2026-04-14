from backend.database.db import SessionLocal
from backend.database.models import User, Policy, RiskPrediction, ReviewQueue, FraudReview, AuditLog, Report

db = SessionLocal()
user = db.query(User).filter(User.email == 'demo@insureiq.com').first()
if user:
    # Delete dependent records first
    policy_ids = [p.id for p in db.query(Policy).filter(Policy.user_id == user.id).all()]
    
    db.query(ReviewQueue).filter(ReviewQueue.policy_id.in_(policy_ids)).delete(synchronize_session=False)
    db.query(FraudReview).filter(FraudReview.user_id == user.id).delete(synchronize_session=False)
    db.query(AuditLog).filter(AuditLog.user_id == user.id).delete(synchronize_session=False)
    db.query(Report).filter(Report.user_id == user.id).delete(synchronize_session=False)
    db.query(RiskPrediction).filter(RiskPrediction.user_id == user.id).delete(synchronize_session=False)
    db.query(Policy).filter(Policy.user_id == user.id).delete(synchronize_session=False)
    
    db.commit()
    print('Cleared data for demo@insureiq.com')
else:
    print('User demo@insureiq.com not found')
db.close()
