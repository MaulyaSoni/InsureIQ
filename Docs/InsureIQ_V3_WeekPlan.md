# InsureIQ v3 — Week-by-Week Plan
> Branch: `v3/autonomous`
> Goal: Multi-tenant SaaS with autonomous portfolio intelligence
> Timeline: 6 weeks post v2 deployment
> Pre-requisite: v2 (MCP tools + ReAct agent) fully deployed

---

## What v3 Adds Over v2

```
v1: Agentic pipeline + streaming UI + single-tenant deploy
v2: Tool-using ReAct chatbot + MCP tools + Vahan/IRDAI live data
v3: Multi-tenant SaaS + scheduled intelligence + alerts + rule builder
```

The shift in v3 is from **reactive** (user asks → system answers) to **proactive** (system monitors → system alerts). InsureIQ stops waiting to be asked and starts surfacing insights autonomously.

---

## Week 1 — Multi-Tenant Organisation Architecture

### Day 1–2 · Organisation model + data isolation

```python
# backend/database/models.py — add Organisation
class Organisation(Base):
    __tablename__ = "organisations"
    id: str            # UUID PK
    name: str          # e.g. "SureSafe Insurance Pvt. Ltd."
    slug: str          # url-safe: "suresafe" → used in subdomain routing
    plan: str          # "starter" | "professional" | "enterprise"
    irdai_reg_no: str  # IRDAI registration number
    logo_url: str      # for white-label UI
    primary_color: str # hex — custom brand color per org
    created_at: datetime
    is_active: bool

# Add to User model:
    organisation_id: str  # FK → organisations
    role: str            # "admin" | "manager" | "analyst" | "viewer"
```

**Data isolation rule — apply to EVERY endpoint:**
```python
# Every query must scope to current_user.organisation_id
# WRONG:
policies = db.query(Policy).filter(Policy.user_id == current_user.id)
# RIGHT:
policies = db.query(Policy).filter(
    Policy.organisation_id == current_user.organisation_id
)
```

### Day 3 · Organisation onboarding flow

```
POST /organisations/register  → create org + first admin user
POST /organisations/invite    → send invite email (log to console in dev)
GET  /organisations/me        → org details + plan + member count
PUT  /organisations/me        → update name, logo, IRDAI reg no
GET  /organisations/members   → list all users with roles
PUT  /organisations/members/{id}/role → change role (admin only)
```

### Day 4–5 · White-label theming per org

```typescript
// frontend/src/contexts/OrgContext.tsx
interface OrgConfig {
  name: string;
  logo_url: string | null;
  primary_color: string;  // e.g. "#1B4FD8" for a specific client
  slug: string;
}

// On login, fetch org config and inject into CSS variables:
document.documentElement.style.setProperty('--brand-primary', org.primary_color);
document.documentElement.style.setProperty('--brand-dark', darken(org.primary_color, 15));
```

This means each insurance company sees their own logo and brand colour — true white-label.

---

## Week 2 — Scheduled Portfolio Intelligence

### Day 6–7 · Background scheduler

```python
# Install: pip install apscheduler
# backend/scheduler/jobs.py

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

scheduler = AsyncIOScheduler()

@scheduler.scheduled_job(CronTrigger(hour=7, minute=0))  # 7 AM daily
async def daily_portfolio_review():
    """
    For every active organisation:
    1. Get all policies with predictions older than 7 days
    2. Re-run XGBoost on each (no LLM — fast)
    3. Flag any policies where risk_band WORSENED since last check
    4. Generate a portfolio intelligence summary via Groq
    5. Store as a DailyReport + create notifications for flagged policies
    """
    pass

@scheduler.scheduled_job(CronTrigger(day=1, hour=8))  # 1st of each month
async def monthly_portfolio_report():
    """
    Generate full monthly underwriting report for each org.
    Includes: risk distribution trends, top 10 at-risk policies,
    fraud signals summary, premium adequacy analysis.
    """
    pass
```

### Day 8 · Notification system backend

```python
# backend/database/models.py — add Notification
class Notification(Base):
    __tablename__ = "notifications"
    id: str
    organisation_id: str
    user_id: str           # null = all users in org
    type: str              # "risk_worsened" | "batch_complete" | "fraud_flag" | "renewal_due"
    title: str
    message: str
    policy_id: str         # nullable — linked policy
    severity: str          # "info" | "warning" | "critical"
    read: bool = False
    created_at: datetime

# backend/routers/notifications.py
GET  /notifications              → unread for current user
POST /notifications/{id}/read    → mark as read
POST /notifications/read-all     → mark all read
GET  /notifications/settings     → user notification preferences
PUT  /notifications/settings     → toggle which events trigger notifications
```

### Day 9–10 · Email alerts (optional — free with Gmail SMTP)

```python
# backend/services/email_service.py
# Uses Gmail SMTP (free) or any SMTP provider

import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

class EmailService:
    def send_risk_alert(self, to_email: str, policy_number: str,
                        old_band: str, new_band: str, org_name: str):
        subject = f"[InsureIQ] Risk Alert — Policy {policy_number} escalated to {new_band}"
        body = f"""
        Risk Change Detected — {org_name}

        Policy {policy_number} has escalated from {old_band} → {new_band}.
        
        Login to review: https://insure-iq-sepia.vercel.app/policies/{policy_number}
        
        InsureIQ Intelligence Platform
        """
        # Send via Gmail SMTP
        # Add SMTP_EMAIL and SMTP_PASSWORD to .env

    def send_daily_digest(self, to_email: str, summary: str, org_name: str):
        # Daily portfolio summary email
        pass
```

---

## Week 3 — Custom Underwriting Rule Builder

### Day 11–13 · Rule engine architecture

This is the v3 headline feature. Business users (managers/admins) can build their own underwriting rules through a UI — no code required. Rules supplement the ML model with company-specific logic.

```python
# backend/database/models.py — add UnderwritingRule
class UnderwritingRule(Base):
    __tablename__ = "underwriting_rules"
    id: str
    organisation_id: str   # Rules are per-organisation
    name: str              # "Flag high-mileage commercial in Mumbai"
    description: str
    conditions: str        # JSON: [{field, operator, value, logic}]
    action: str            # "flag" | "decline" | "load_premium" | "require_inspection"
    loading_pct: float     # If action=load_premium
    severity: str          # "info" | "warning" | "hard_block"
    enabled: bool = True
    created_by: str        # user_id
    created_at: datetime

# Example rule in JSON:
{
  "name": "Mumbai commercial > 10yr",
  "conditions": [
    {"field": "city", "operator": "equals", "value": "Mumbai", "logic": "AND"},
    {"field": "vehicle_use", "operator": "equals", "value": "commercial", "logic": "AND"},
    {"field": "vehicle_year", "operator": "less_than", "value": 2015}
  ],
  "action": "load_premium",
  "loading_pct": 25.0,
  "severity": "warning"
}
```

```python
# backend/ml/rule_engine.py
def evaluate_rules(policy: dict, org_id: str, db: Session) -> list[RuleMatch]:
    """
    Run all active rules for an organisation against a policy.
    Returns list of matched rules with their actions.
    """
    rules = db.query(UnderwritingRule).filter(
        UnderwritingRule.organisation_id == org_id,
        UnderwritingRule.enabled == True
    ).all()

    matches = []
    for rule in rules:
        conditions = json.loads(rule.conditions)
        if _evaluate_conditions(policy, conditions):
            matches.append(RuleMatch(
                rule_id=rule.id,
                rule_name=rule.name,
                action=rule.action,
                loading_pct=rule.loading_pct,
                severity=rule.severity
            ))
    return matches

def _evaluate_conditions(policy: dict, conditions: list) -> bool:
    """Evaluate all conditions with AND/OR logic"""
    result = True
    for cond in conditions:
        field_value = policy.get(cond["field"])
        op = cond["operator"]
        val = cond["value"]
        match = (
            (op == "equals" and str(field_value) == str(val)) or
            (op == "greater_than" and float(field_value or 0) > float(val)) or
            (op == "less_than" and float(field_value or 0) < float(val)) or
            (op == "contains" and str(val).lower() in str(field_value or "").lower())
        )
        if cond.get("logic") == "OR":
            result = result or match
        else:
            result = result and match
    return result
```

### Day 14 · Rule Builder UI

```tsx
// frontend/src/pages/RuleBuilder.tsx
// Drag-and-drop condition builder — no code needed

// Fields available: vehicle_make, vehicle_year, vehicle_use, city,
//                   engine_cc, insured_value, prior_claims_count,
//                   annual_mileage_km, parking_type, ncb_percentage

// Operators: equals, not_equals, greater_than, less_than, contains, between

// Actions: flag_for_review, decline, load_premium (with %), require_inspection

// UI pattern (inspired by Zapier conditions UI):
// IF [field dropdown] [operator dropdown] [value input]
// AND/OR
// IF [field dropdown] [operator dropdown] [value input]
// THEN [action dropdown] [optional: loading %]
```

---

## Week 4 — Renewal Intelligence Module

### Day 15–17 · Renewal prediction + advisory

```python
# backend/ml/renewal_scorer.py
def compute_renewal_intelligence(policy: Policy,
                                  prediction: RiskPrediction) -> dict:
    """
    Predict: will this policy lapse? How should it be repriced?
    No additional ML model — rule-based logic on existing data.
    """
    vehicle_age = 2025 - policy.vehicle_year
    lapse_probability = 0.1  # base

    # High risk = insurer will load premium heavily = customer shops around
    if prediction.risk_band == "CRITICAL":
        lapse_probability += 0.35
    elif prediction.risk_band == "HIGH":
        lapse_probability += 0.20

    # Long NCB = loyal customer but may find better deal
    if policy.ncb_percentage >= 40:
        lapse_probability += 0.15

    # Vehicle getting older = customer may downgrade to TP only
    if vehicle_age >= 8:
        lapse_probability += 0.10

    # Recommendation
    if lapse_probability < 0.25:
        renewal_rec = "RETAIN"
        premium_change_pct = 0
    elif prediction.risk_band in ("LOW", "MEDIUM"):
        renewal_rec = "RETAIN"
        premium_change_pct = round(prediction.claim_probability * 15, 1)
    elif prediction.risk_band == "HIGH":
        renewal_rec = "REPRICE"
        premium_change_pct = round(prediction.claim_probability * 25, 1)
    else:
        renewal_rec = "LET_LAPSE" if lapse_probability > 0.6 else "REPRICE"
        premium_change_pct = round(prediction.claim_probability * 40, 1)

    return {
        "lapse_probability": round(lapse_probability, 2),
        "renewal_recommendation": renewal_rec,  # RETAIN|REPRICE|LET_LAPSE|REVIEW
        "suggested_premium_change_pct": premium_change_pct,
        "risk_change_flag": vehicle_age >= 8 or policy.prior_claims_count > 1,
        "days_to_expiry": (policy.policy_start_date + timedelta(
            days=policy.policy_duration_months * 30) - date.today()).days
    }
```

```
GET  /renewal/upcoming           → policies expiring in next 60 days + renewal scores
GET  /renewal/at-risk            → policies with lapse_probability > 0.5
POST /renewal/{policy_id}/advisory → Groq generates renewal advisory letter
GET  /renewal/summary            → portfolio-level renewal intelligence
```

---

## Week 5 — Model Retraining Pipeline

### Day 18–20 · Continuous learning from decisions

```python
# backend/ml/retraining_pipeline.py

"""
The key insight: underwriting decisions are ground truth.
When a manager marks a policy DECLINED (turns out high risk)
or APPROVE (turns out low risk), that's labelled data we can use.
"""

def extract_training_feedback(db: Session, org_id: str) -> pd.DataFrame:
    """
    Pull underwriting decisions + their eventual outcomes.
    Maps: policy features + uw_decision + (if available) actual_claim → training row
    """
    decisions = db.query(UnderwritingDecision).join(Policy).filter(
        Policy.organisation_id == org_id,
        UnderwritingDecision.created_at < datetime.now() - timedelta(days=90)
    ).all()

    rows = []
    for dec in decisions:
        policy = dec.policy
        rows.append({
            **policy_to_feature_dict(policy),
            "uw_label": 1 if dec.decision in ("DECLINE", "LOAD_PREMIUM") else 0,
            "loading_pct": dec.premium_loading_pct or 0,
        })
    return pd.DataFrame(rows)

def retrain_on_feedback(db: Session, org_id: str):
    """
    Fine-tune the XGBoost model with organisation-specific feedback data.
    Saves an org-specific model: model_store/{org_id}_xgb_v2.pkl
    """
    feedback_df = extract_training_feedback(db, org_id)
    if len(feedback_df) < 100:
        return {"status": "insufficient_data", "samples": len(feedback_df)}

    X = feedback_df.drop("uw_label", axis=1)
    y = feedback_df["uw_label"]

    # Load base model and continue training (warm start)
    base_model = joblib.load("ml/model_store/xgb_v1.pkl")
    org_model = xgb.XGBClassifier(**base_model.get_params())
    org_model.fit(X, y, xgb_model=base_model.get_booster())

    org_model_path = f"ml/model_store/{org_id}_xgb_v2.pkl"
    joblib.dump(org_model, org_model_path)
    return {"status": "success", "samples_used": len(feedback_df), "model_path": org_model_path}
```

---

## Week 6 — V3 Polish + SaaS Launch Prep

### Day 21–22 · Usage analytics + billing hooks

```python
# backend/database/models.py — add UsageLog
class UsageLog(Base):
    __tablename__ = "usage_logs"
    id: str
    organisation_id: str
    event_type: str    # "risk_analysis" | "batch_run" | "report_gen" | "chat_message"
    count: int = 1
    date: date         # group by date for billing

# backend/services/usage_service.py
def check_plan_limits(org_id: str, event_type: str, db: Session) -> bool:
    """Return False if org has hit their plan limit for the month"""
    PLAN_LIMITS = {
        "starter":      {"risk_analysis": 50,  "batch_run": 2,   "report_gen": 10},
        "professional": {"risk_analysis": 500, "batch_run": 20,  "report_gen": 100},
        "enterprise":   {"risk_analysis": -1,  "batch_run": -1,  "report_gen": -1},
    }
    # -1 = unlimited
    # Check current month usage vs plan limit
    pass
```

### Day 23–24 · Landing page (separate from the app)

```
A simple landing page at insureiq.com (or subdomain) with:
- Hero: "AI-Powered Underwriting Intelligence for Indian Insurance"
- 3 value props: Speed (247 policies in 5 min), Explainability (SHAP), Compliance (IRDAI)
- Architecture diagram (the HTML file we already generated)
- "Request Demo" CTA → email form
- Tech stack badges
- Live demo link

Stack: Next.js or plain HTML/Tailwind — keep it simple
```

### Day 25–30 · V3 QA + Documentation

```
□ Multi-tenant: Organisation A cannot see Organisation B's data
□ Rule builder: custom rule fires correctly on risk assessment
□ Scheduled job: daily review runs, notifications created
□ Renewal intelligence: expiring policies shown with lapse probability
□ Model retraining: runs successfully with 100+ feedback samples
□ Email alerts: send on risk escalation
□ White-label: custom logo + colour per org works on login
□ Usage limits: starter plan blocks after 50 analyses
□ API documentation: FastAPI /docs endpoint complete
□ README: deployment guide for enterprise client self-hosting
```

---

## V3 Summary Table

| Week | Feature | Key Deliverable |
|------|---------|----------------|
| W1 | Multi-tenant | Organisation model, data isolation, white-label theming |
| W2 | Proactive intelligence | Scheduler, notifications, email alerts |
| W3 | Rule builder | Custom underwriting rules, rule engine, UI |
| W4 | Renewal intelligence | Lapse prediction, renewal advisory, expiry dashboard |
| W5 | Model retraining | Feedback loop from UW decisions, org-specific models |
| W6 | SaaS prep | Usage tracking, plan limits, landing page, final QA |

---

## Full 3-Version Roadmap Summary

```
InsureIQ v1 (LIVE)
└── XGBoost + SHAP + LangGraph 4-node pipeline
└── SSE streaming + Agent trace UI
└── Streaming chatbot (policy-context aware)
└── JWT auth + RBAC (4 roles)
└── Batch analysis + PDF reports
└── Vercel + Render · Single-tenant

InsureIQ v2 (Building)
└── MCP Tool Registry (6 tools)
└── ReAct loop — Thought → Tool → Observe → Answer
└── IRDAI tariff · Fraud check · Vehicle lookup · Market benchmark
└── Tool call UI in chat (visible reasoning steps)
└── Chat persistence to SQLite

InsureIQ v3 (Planned)
└── Multi-tenant with data isolation
└── White-label theming per organisation
└── Scheduled portfolio intelligence (daily/monthly)
└── Email + in-app notifications
└── Custom underwriting rule builder (no-code)
└── Renewal intelligence + lapse prediction
└── Continuous model retraining from UW decisions
└── Usage analytics + plan limits (SaaS billing hooks)
└── Public landing page
```
