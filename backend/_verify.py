import sys
sys.path.insert(0, 'd:/InsureIQ')

checks = [
    ('main_app', 'from backend.main import app'),
    ('groq_client', 'from backend.llm.groq_client import invoke_llm, invoke_with_retry'),
    ('cache_ttls', 'from backend.llm.cache import TTL_RISK_EXPLAIN, TTL_PREMIUM, TTL_REPORT, TTL_CLAIM, TTL_IRDAI'),
    ('prompts', 'from backend.llm.prompts import RISK_EXPLAINER_PROMPT, PREMIUM_ADVISOR_PROMPT, REPORT_WRITER_PROMPT, SUPERVISOR_PROMPT'),
    ('state', 'from backend.agents.state import InsureIQState'),
    ('supervisor', 'from backend.agents.nodes.supervisor import supervisor_node'),
    ('risk_node', 'from backend.agents.nodes.risk_node import risk_node'),
    ('explainer_node', 'from backend.agents.nodes.explainer_node import explainer_node'),
    ('premium_node', 'from backend.agents.nodes.premium_node import premium_node'),
    ('report_node', 'from backend.agents.nodes.report_node import report_node'),
    ('graph', 'from backend.agents.graph import insureiq_graph'),
    ('batch', 'from backend.routers.batch import router as batch_router'),
    ('dashboard', 'from backend.routers.dashboard import router as dashboard_router'),
    ('claims', 'from backend.routers.claims import router as claims_router'),
    ('policies', 'from backend.routers.policies import router as policies_router'),
    ('reports', 'from backend.routers.reports import router as reports_router'),
    ('premium', 'from backend.routers.premium import router as premium_router'),
    ('risk_scorer_enum', 'from backend.ml.risk_scorer import risk_score_to_band_enum'),
    ('risk_scorer_prob', 'from backend.ml.risk_scorer import probability_to_risk_score'),
    ('feature_engineer', 'from backend.ml.feature_engineer import policy_to_feature_vector'),
]

all_ok = True
for name, import_str in checks:
    try:
        exec(import_str, globals())
        print(f'OK: {name}')
    except Exception as e:
        print(f'FAIL: {name} -> {e}')
        all_ok = False

print()
if all_ok:
    print('ALL OK - Phase 3 and Phase 4 COMPLETE')
else:
    print('SOME CHECKS FAILED')
