# InsureIQ v1 — Week-by-Week Completion Plan
> Deployed: Vercel (frontend) + Render (backend)
> Status: Core shipped · Finalising production polish

---

## Week 1 — Production Stabilisation (Do This Now)

### Day 1–2 · PDF Bug + Prompt Fix
**PDF Report Bug**
- [ ] Open `backend/agents/nodes/report_node.py`
- [ ] Find the `except` block in the Groq call
- [ ] Replace fallback string — remove any reference to `user_content`, `Input:`, or raw prompt text
- [ ] New fallback must build from `state` fields only: `risk_score`, `risk_band`, `claim_probability`, `risk_explanation`, `premium_min`, `premium_max`, `policy_data`
- [ ] Open `backend/routers/reports.py` — add guard before ReportLab: if `'[LLM fallback]' in report.content` → raise 422
- [ ] Open `frontend/src/pages/Reports.tsx` — catch 422, show toast error instead of empty download

**Prompt Engineering Fix**
- [ ] Open `backend/llm/prompts.py`
- [ ] Update `RISK_EXPLAINER_PROMPT` — add rule: every factor must cite the actual policy value (e.g. "vehicle age: 11 years" not just "vehicle age")
- [ ] Update `REPORT_WRITER_PROMPT` — add the 7 mandatory section headers, add rule: never include "Input:", "Prompt:", "LLM", "fallback" in output
- [ ] In `explainer_node.py` — update `user_content` to include actual feature values alongside SHAP scores

**Verify**
```bash
grep -rn "Input:\|LLM fallback\|You are a senior" backend/ | grep -v ".pyc"
# Must return 0 matches in non-comment code
```

---

### Day 3 · SHAP Field Name Fix
- [ ] Open `frontend/src/lib/api.ts`
- [ ] Add `normaliseRiskResponse()` transformer that maps `shap_features`, `top_features`, `risk_factors` → consistent field
- [ ] Apply transformer to `runAllAnalysis()`, `assessRisk()`, `getRiskPrediction()`
- [ ] Open `frontend/src/pages/RiskAssessment.tsx`
- [ ] Replace every `result.risk_factors` / `policy.risk_factors` with `result.shap_features`
- [ ] Verify SHAP bars render with `plain_name` labels and correct direction colors

---

### Day 4 · ClaimPrediction + modules.py
**ClaimPrediction wiring**
- [ ] Add `checkClaimEligibility()` to `api.ts`
- [ ] Update `ClaimPrediction.tsx` submit handler — two sequential calls: predict first (fast), then eligibility (LLM)
- [ ] Add separate loading state for eligibility section
- [ ] Render `ClaimAssessment` result: eligible badge, rejection risks, documents required, next steps

**modules.py cleanup**
- [ ] Open `backend/routers/modules.py`
- [ ] Replace every `if risk_band == "CRITICAL": return f"..."` pattern with real Groq call
- [ ] Each function must call `invoke_llm_with_retry()` and use `prompts.py` constants
- [ ] Add cache check before every Groq call
- [ ] Run: `grep -c "if risk_band\|elif risk_band\|return f\"Your" backend/routers/modules.py` → must be 0

---

### Day 5 · Toast Notifications + Empty States
**Install and configure Sonner**
```bash
cd frontend && npm install sonner
```
Add `<Toaster />` to `App.tsx`. Import `toast` everywhere needed.

**Toasts to add (8 total)**
| Action | Toast | Type |
|--------|-------|------|
| Policy created | "Policy #IQ-XXXXX created" | success |
| Risk analysis complete | "Analysis complete · HIGH risk" | success |
| Groq 429 hit | "AI rate limit. Retrying in 60s..." | warning |
| PDF downloaded | "Underwriting report downloaded" | success |
| PDF generation failed | "Report unavailable. Re-run analysis." | error |
| Batch complete | "Batch complete: 247 policies analysed" | success |
| Session expired | "Session expired. Please sign in again." | warning |
| CSV import partial | "12 imported. 3 failed — see errors." | warning |

**Empty states (3 pages)**
- `Policies.tsx` — no policies: illustration + "No policies yet" + "Import CSV" CTA
- `Reports.tsx` — no reports: illustration + "No reports generated" + "Run analysis on a policy" CTA
- `BatchAnalysis.tsx` — no jobs: illustration + "No batch runs yet" + upload zone

---

### Day 6–7 · Error States + Health Check
**Loading/error pattern — apply to all 6 data-fetching pages**
```typescript
// Add to every page that fetches data
const [status, setStatus] = useState<'idle'|'loading'|'success'|'error'>('idle');
const [errorMsg, setErrorMsg] = useState<string | null>(null);
```

**Update GET /health**
```python
@app.get("/health")
async def health(request: Request):
    return {
        "status": "ok",
        "model_loaded": hasattr(request.app.state, 'model') and request.app.state.model is not None,
        "db_connected": check_db_connection(),
        "groq_key_present": bool(os.getenv("GROQ_API_KEY")),
        "version": "1.0.0",
        "environment": os.getenv("ENVIRONMENT", "development")
    }
```

---

## Week 2 — Features + Polish

### Day 8–9 · Audit Log Export + Chat Persistence

**Audit log CSV export**
```python
# backend/routers/audit.py — add:
@router.get("/logs/export")
async def export_audit_log(
    format: str = "csv",
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    action_filter: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    logs = get_audit_logs_filtered(db, current_user.id, start_date, end_date, action_filter)
    # Convert to CSV using pandas or csv module
    # Return as StreamingResponse with text/csv content-type
```
- [ ] Add "Export CSV" button to `AuditLog.tsx`
- [ ] Wire to `GET /audit/logs/export?format=csv`

**Chat persistence**
- [ ] Add `ChatSession` and `ChatMessage` ORM models to `models.py`
- [ ] Add session CRUD to `repository.py`
- [ ] Update `POST /chat/stream` to save user + assistant messages after each exchange
- [ ] On `ChatDrawer` open: load last session for `(user_id, policy_id)` pair
- [ ] Add "New Conversation" button that creates a fresh session

---

### Day 10–11 · Premium What-If Fix + Market Benchmark

**Fix /premium/what-if response shape**
```python
# backend/routers/premium.py
class WhatIfResponse(BaseModel):
    before: dict   # risk_score, risk_band, claim_prob, premium_min, premium_max
    after: dict    # same fields post-modification
    delta: dict    # risk_score_delta, premium_delta, premium_delta_pct, narrative, improved: bool
```
- [ ] Update endpoint to return all three objects
- [ ] Update `PremiumAdvisory.tsx` to render before/after comparison table
- [ ] Show delta with colored arrows (↓ green = improvement, ↑ red = worse)

**IRDAI market benchmark section**
- [ ] Add `get_irdai_benchmark(cc: int, use: str, vehicle_year: int) -> dict` to `ml/risk_scorer.py`
- [ ] Use hardcoded IRDAI tariff bands (no external API needed):
  - `< 1000cc personal: TP ₹2,094`
  - `1000–1500cc personal: TP ₹3,416`
  - `> 1500cc personal: TP ₹7,897`
  - `Commercial: multiply by 1.5`
- [ ] Return: `{irdai_tp_floor, estimated_od, total_floor, effective_date, circular_ref}`
- [ ] Add benchmark comparison card to `PremiumAdvisory.tsx`

---

### Day 12–13 · Source Badge + Message Timestamps

**AI vs fallback badge**
- [ ] Add `source: 'groq' | 'cache' | 'fallback'` to every LLM response
- [ ] Update `groq_client.py` — return `{"content": str, "source": "groq", "model": str, "latency_ms": int}`
- [ ] Update `AICard.tsx` — show `AI · llama-3.3-70b` badge when source=groq, `⚡ cached` when cache, `⚠ fallback` when fallback

**Chat message timestamps**
- [ ] Add `timestamp: Date` to message state in `useStreamingChat.ts`
- [ ] Set timestamp when message is added
- [ ] Render below each bubble: `just now`, `2 min ago`, `10:42 AM`

---

### Day 14 · v1 Final QA + Demo Video

**QA checklist**
```
□ Login → dashboard → create policy → run analysis → PDF downloads correctly
□ SHAP bars show plain_name labels and correct colors
□ Chat streams word-by-word with policy context
□ Agent trace nodes light up sequentially
□ Batch analysis progress bar updates + completes
□ Audit log export CSV downloads
□ All 8 toast notifications fire correctly
□ Dark mode: every page readable
□ Render health endpoint returns model_loaded: true
□ Vercel build: npm run build zero errors
```

**Demo video script (2 minutes)**
1. Login as analyst@suresafe.in (0:00–0:10)
2. Dashboard — real KPIs from 247 seeded policies (0:10–0:25)
3. Open a CRITICAL policy → click Run Analysis → watch agent trace (0:25–0:55)
4. Explanation streams in, premium range shows, download PDF (0:55–1:15)
5. Open chat → ask "why is this policy critical?" → streaming response (1:15–1:40)
6. Batch analysis — run on 20 policies, progress bar (1:40–1:55)
7. Audit log export (1:55–2:00)

---

## Week 3 — v1 Complete · v2 Kickoff

### Day 15 · v2 Architecture Design

**Create v2 branch**
```bash
git checkout -b v2/mcp-tools
```

**Create tool infrastructure**
```
backend/
├── tools/
│   ├── __init__.py
│   ├── base.py          ← BaseTool class + ToolRegistry
│   ├── registry.py      ← Global registry instance
│   ├── irdai_tariff.py  ← Tool 1: IRDAI tariff lookup
│   ├── fraud_check.py   ← Tool 2: fraud registry check
│   ├── portfolio_query.py ← Tool 3: natural language → SQL
│   ├── vehicle_lookup.py  ← Tool 4: Vahan registration (Week 4)
│   └── market_benchmark.py ← Tool 5: competitor rates (Week 4)
```

**BaseTool interface**
```python
# backend/tools/base.py
from abc import ABC, abstractmethod
from pydantic import BaseModel
from typing import Any

class ToolResult(BaseModel):
    success: bool
    data: Any
    error: Optional[str] = None
    source: str   # "internal_db" | "irdai_circular" | "external_api" | "rule_based"
    latency_ms: int

class BaseTool(ABC):
    name: str
    description: str     # Critical — this is what the LLM reads
    input_schema: type[BaseModel]

    @abstractmethod
    def execute(self, **kwargs) -> ToolResult:
        pass

    def to_groq_tool(self) -> dict:
        """Returns tool definition in Groq function calling format"""
        return {
            "type": "function",
            "function": {
                "name": self.name,
                "description": self.description,
                "parameters": self.input_schema.model_json_schema()
            }
        }
```

---

### Day 16–17 · Build First 3 Tools

**Tool 1 — IRDAI Tariff Lookup**
```python
# backend/tools/irdai_tariff.py
class IRDAITariffInput(BaseModel):
    engine_cc: int
    vehicle_use: Literal["personal", "commercial", "rideshare"]
    vehicle_year: int

class IRDAITariffTool(BaseTool):
    name = "irdai_tariff_lookup"
    description = (
        "Look up current IRDAI motor insurance premium rates. "
        "Use when you need: third-party premium floor, own damage rate, "
        "or to check if a policy is correctly priced against IRDAI mandated rates."
    )
    input_schema = IRDAITariffInput

    # Hardcoded from IRDAI Motor Tariff (updated June 2023)
    TP_RATES = {
        "personal": {(0, 1000): 2094, (1000, 1500): 3416, (1500, float("inf")): 7897},
        "commercial": {(0, 1000): 3132, (1000, 1500): 5124, (1500, float("inf")): 11845},
    }

    def execute(self, engine_cc: int, vehicle_use: str, vehicle_year: int) -> ToolResult:
        rates = self.TP_RATES.get(vehicle_use, self.TP_RATES["personal"])
        tp = next(v for (lo, hi), v in rates.items() if lo <= engine_cc < hi)
        vehicle_age = 2025 - vehicle_year
        od_base_rate = 0.025 + max(0, vehicle_age - 5) * 0.002
        return ToolResult(
            success=True,
            data={
                "tp_premium": tp,
                "od_base_rate_pct": round(od_base_rate * 100, 2),
                "circular_ref": "IRDAI/NL/CIR/MOT/074/05/2023",
                "effective_date": "2023-06-01",
                "notes": f"TP rate for {engine_cc}cc {vehicle_use} vehicle"
            },
            source="irdai_circular",
            latency_ms=0
        )
```

**Tool 2 — Fraud Registry Check**
*(reads from your existing fraud_signals in DB — zero external dependency)*

**Tool 3 — Portfolio Analytics Query**
*(reads from your existing policies + predictions tables)*

---

### Day 18–20 · ReAct Loop Upgrade

**Upgrade chat to LangGraph ReAct**

```python
# backend/agents/react_chat_graph.py
from typing import TypedDict, Optional, Annotated
from langgraph.graph import StateGraph, END
import operator

class ReActState(TypedDict):
    messages: list[dict]           # conversation history
    policy_id: Optional[str]       # current policy context
    policy_data: Optional[dict]    # loaded policy fields
    tool_calls: list[dict]         # [{tool, input, result}]
    steps: int                     # stop at 5
    final_answer: Optional[str]
    session_id: str

def should_continue(state: ReActState) -> str:
    if state["steps"] >= 5:
        return "answer"
    if state.get("final_answer"):
        return "answer"
    last_msg = state["messages"][-1]
    if last_msg.get("tool_calls"):
        return "tool_executor"
    return "answer"

# Nodes: llm_node → tool_executor → llm_node (loop) → answer_node
```

**Stream tool calls to UI**
Each tool call streams a special event type:
```
event: tool_call
data: {"tool": "irdai_tariff_lookup", "input": {"cc": 1497}, "status": "running"}

event: tool_result
data: {"tool": "irdai_tariff_lookup", "result": {"tp_premium": 3416}, "latency_ms": 12}
```

**Update ChatDrawer.tsx** — render tool calls as inline steps:
```tsx
{msg.tool_calls?.map(tc => (
  <div className="tool-call-step">
    <span className="tool-icon">🔍</span>
    <span className="tool-name">{tc.tool}</span>
    {tc.status === 'running' && <Spinner size="xs" />}
    {tc.result && <span className="tool-result">{summariseResult(tc.result)}</span>}
  </div>
))}
```

---

## Summary Table

| Week | Focus | Key Deliverables | Deploy? |
|------|-------|-----------------|---------|
| Week 1 | Stabilisation | PDF fix, SHAP fix, ClaimPrediction, modules.py, toasts, empty states | Patch to Render/Vercel |
| Week 2 | Features | Audit export, chat persistence, what-if fix, benchmark, source badges | Patch deploy |
| Week 3 | v1 QA + v2 kickoff | Demo video, v2 branch, tool infrastructure, first 3 tools | Tag v1.0 release |
| Week 4 | v2 core | ReAct loop, external tools (Vahan, benchmark), chat UI update | v2 beta deploy |
| Week 5 | v2 polish | Tool error handling, tool call UI, v2 demo video | v2 production |

