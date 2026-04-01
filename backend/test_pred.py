import traceback
import sys
try:
    from app.ml import DummyModel, DummyExplainer, policy_to_vector
    from app.models import Policy
    p = Policy(production_year=2020, prior_claims=1, usage_type='personal', engine_cc=1500, insured_value=12000)
    v = policy_to_vector(p)
    print("Vec:", v)
    m = DummyModel()
    sc = m.predict(v)[0]
    print("Score:", sc)
    ex = DummyExplainer()
    print("Expl:", ex.explain(v))
except Exception as e:
    traceback.print_exc()
