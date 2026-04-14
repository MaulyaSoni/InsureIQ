import requests
BASE_URL = 'http://127.0.0.1:8000/api'
res = requests.post(f'{BASE_URL}/auth/login', json={'email':'demo@insureiq.com', 'password':'demo1234'})
if not res.ok:
    print('login failed:', res.text)
    exit(1)
token = res.json()['access_token']
headers = {'Authorization': f'Bearer {token}'}

print('Fetching policies...')
p_res = requests.get(f'{BASE_URL}/policies', headers=headers)
policies = p_res.json().get('policies', [])
if not policies:
    print('no policies')
    exit(1)
policy_id = policies[0]['id']

print('--- 4. What-If ---')
r4 = requests.post(f'{BASE_URL}/premium/what-if', json={'policy_id': str(policy_id), 'adjustments': {'add_anti_theft': True}}, headers=headers)
print('4 code:', r4.status_code)
try:
    print('keys:', list(r4.json().keys()))
except: pass

print('--- 5. Eligibility ---')
r5 = requests.post(f'{BASE_URL}/claims/eligibility', json={'policy_id': str(policy_id), 'incident_type': 'collision', 'damage_severity': 'high'}, headers=headers)
print('5 code:', r5.status_code)
try:
    print('keys:', list(r5.json().keys()))
except: pass

print('--- 6. Run-All ---')
r6 = requests.post(f'{BASE_URL}/policies/{policy_id}/run-all', headers=headers)
print('6 code:', r6.status_code)
try:
    d6 = r6.json()
    print('keys:', list(d6.keys()))
    print('shap_features length:', len(d6.get('risk', {}).get('shap_features', [])))
    print('risk_explanation:', d6.get('risk', {}).get('explanation', None) is not None)
except: pass

print('--- 8. PDF ---')
r7 = requests.get(f'{BASE_URL}/reports', headers=headers)
reports = r7.json()
if reports:
    rep_id = reports[0]['id']
    pdf_r = requests.get(f'{BASE_URL}/reports/{rep_id}/pdf', headers=headers)
    print('PDF OK:', pdf_r.status_code, 'Len:', len(pdf_r.content))
else:
    print('Generating report to test pdf...')
    r8 = requests.post(f'{BASE_URL}/reports/generate', json={'policy_id': str(policy_id)}, headers=headers)
    rep_id = r8.json()['id']
    pdf_r = requests.get(f'{BASE_URL}/reports/{rep_id}/pdf', headers=headers)
    print('PDF OK:', pdf_r.status_code, 'Len:', len(pdf_r.content))

