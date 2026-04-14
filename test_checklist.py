import sys, os
sys.path.insert(0, os.path.abspath('.'))
from fastapi.testclient import TestClient
from backend.main import app
from backend.database.db import SessionLocal
from backend.database.models import User, Policy

def check():
    client = TestClient(app)
    db = SessionLocal()
    user = db.query(User).filter(User.email == 'demo@insureiq.com').first()
    if not user:
        user = db.query(User).first()
    policy = db.query(Policy).filter(Policy.user_id == user.id).first()
    db.close()

    res = client.post('/api/auth/token', data={'username': user.email, 'password': 'demo1234'})
    if not res.is_success:
        res = client.post('/api/auth/token', data={'username': user.email, 'password': 'password'})
    if not res.is_success:
        res = client.post('/api/auth/token', data={'username': user.email, 'password': 'password123'})
        
    token = res.json()['access_token']
    headers = {'Authorization': f'Bearer {token}'}

    print('--- 4. What-If ---')
    r4 = client.post('/api/premium/what-if', json={'policy_id': str(policy.id), 'adjustments': {'add_anti_theft': True}}, headers=headers)
    print("4 code:", r4.status_code)
    print("keys:", list(r4.json().keys()))

    print('--- 5. Eligibility ---')
    r5 = client.post('/api/claims/eligibility', json={'policy_id': str(policy.id), 'incident_type': 'collision', 'damage_severity': 'high'}, headers=headers)
    print("5 code:", r5.status_code)
    print("keys:", list(r5.json().keys()))

    print('--- 6. Run-All ---')
    r6 = client.post(f'/api/policies/{policy.id}/run-all', headers=headers)
    print("6 code:", r6.status_code)
    try:
        d6 = r6.json()
        print('keys:', list(d6.keys()))
        print('shap_features length:', len(d6.get('risk', {}).get('shap_features', [])))
    except:
        print(r6.text)

    print('--- 8. PDF ---')
    r7 = client.get('/api/reports', headers=headers)
    if len(r7.json()) > 0:
        rep_id = r7.json()[0]['id']
        pdf_r = client.get(f'/api/reports/{rep_id}/pdf', headers=headers)
        print('PDF OK:', pdf_r.status_code, 'Len:', len(pdf_r.content))
    else:
        print('PDF skipped, no reports')

if __name__ == '__main__':
    check()
