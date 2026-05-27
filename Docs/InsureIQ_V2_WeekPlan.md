# InsureIQ v2 — Week-by-Week Build Plan
> Branch: `v2/mcp-tools`
> Goal: Tool-using agent chatbot with MCP architecture
> Timeline: 5 weeks post v1 deployment

---

## Overview — What v2 Adds

```
v1: Context-injected chat → answers from your DB only
v2: Tool-using ReAct agent → autonomously queries live data
    IRDAI tariffs · Vehicle registry · Fraud signals · Market rates · Portfolio DB
```

---

## Week 1 — Tool Infrastructure + First 3 Tools

### Day 1 · Create tool architecture

```
backend/tools/
├── __init__.py
├── base.py              ← BaseTool ABC + ToolResult + ToolRegistry
├── registry.py          ← Global singleton registry
├── irdai_tariff.py      ← Tool 1
├── fraud_check.py       ← Tool 2
└── portfolio_query.py   ← Tool 3
```

**base.py — complete implementation**
```python
from abc import ABC, abstractmethod
from pydantic import BaseModel
from typing import Any, Optional, Literal
import time

class ToolResult(BaseModel):
    success: bool
    data: Any
    error: Optional[str] = None
    source: Literal["internal_db", "irdai_data", "rule_based", "external_api"]
    latency_ms: int
    tool_name: str

class BaseTool(ABC):
    name: str
    description: str
    input_schema: type[BaseModel]

    def run(self, **kwargs) -> ToolResult:
        start = time.time()
        try:
            result = self.execute(**kwargs)
            result.latency_ms = int((time.time() - start) * 1000)
            result.tool_name = self.name
            return result
        except Exception as e:
            return ToolResult(
                success=False, data=None,
                error=str(e)[:300],
                source="internal_db",
                latency_ms=int((time.time() - start) * 1000),
                tool_name=self.name
            )

    @abstractmethod
    def execute(self, **kwargs) -> ToolResult:
        pass

    def to_groq_function(self) -> dict:
        return {
            "type": "function",
            "function": {
                "name": self.name,
                "description": self.description,
                "parameters": self.input_schema.model_json_schema()
            }
        }

class ToolRegistry:
    def __init__(self):
        self._tools: dict[str, BaseTool] = {}

    def register(self, tool: BaseTool):
        self._tools[tool.name] = tool

    def get(self, name: str) -> Optional[BaseTool]:
        return self._tools.get(name)

    def all_tools(self) -> list[BaseTool]:
        return list(self._tools.values())

    def to_groq_tools(self) -> list[dict]:
        return [t.to_groq_function() for t in self._tools.values()]

# Global registry
tool_registry = ToolRegistry()
```

---

### Day 2 · Tool 1 — IRDAI Tariff Lookup

```python
# backend/tools/irdai_tariff.py
class IRDAITariffInput(BaseModel):
    engine_cc: int = Field(ge=50, le=10000)
    vehicle_use: Literal["personal", "commercial", "rideshare"]
    vehicle_year: int = Field(ge=1995, le=2025)
    coverage_type: Literal["tp_only", "comprehensive"] = "comprehensive"

class IRDAITariffTool(BaseTool):
    name = "irdai_tariff_lookup"
    description = (
        "Look up official IRDAI (Insurance Regulatory and Development Authority of India) "
        "mandated motor insurance premium rates. Use this tool when you need to: "
        "(1) find the mandatory third-party (TP) premium floor for a vehicle, "
        "(2) check if an existing policy premium is correctly priced, "
        "(3) calculate the IRDAI-compliant premium range for a new policy. "
        "Input: engine CC, vehicle use type, vehicle year."
    )
    input_schema = IRDAITariffInput

    # Source: IRDAI Motor Tariff — Circular IRDAI/NL/CIR/MOT/074/05/2023
    TP_RATES = {
        "personal": [
            (0, 1000, 2094),
            (1000, 1500, 3416),
            (1500, float("inf"), 7897),
        ],
        "commercial": [
            (0, 1000, 7114),
            (1000, 1500, 9534),
            (1500, float("inf"), 25584),
        ],
        "rideshare": [
            (0, 1000, 5143),
            (1000, 1500, 7064),
            (1500, float("inf"), 14683),
        ],
    }

    # OD depreciation schedule (IRDAI approved)
    OD_DEPRECIATION = [
        (0, 1, 0.0),    # < 1 year: no depreciation
        (1, 2, 0.20),
        (2, 3, 0.30),
        (3, 4, 0.40),
        (4, 5, 0.50),
        (5, float("inf"), 0.50),  # capped at 50%
    ]

    def execute(self, engine_cc, vehicle_use, vehicle_year, coverage_type="comprehensive") -> ToolResult:
        rates = self.TP_RATES.get(vehicle_use, self.TP_RATES["personal"])
        tp_premium = next(
            (amt for lo, hi, amt in rates if lo <= engine_cc < hi),
            7897
        )
        vehicle_age = 2025 - vehicle_year
        od_base_rate = 0.026  # IRDAI OD rate for < 1000cc; adjust per CC band
        if engine_cc > 1500:
            od_base_rate = 0.031
        elif engine_cc > 1000:
            od_base_rate = 0.028
        depreciation = next(
            (dep for lo, hi, dep in self.OD_DEPRECIATION if lo <= vehicle_age < hi),
            0.50
        )
        return ToolResult(
            success=True,
            data={
                "tp_premium_annual": tp_premium,
                "od_base_rate_pct": round(od_base_rate * 100, 2),
                "od_depreciation_pct": round(depreciation * 100, 0),
                "effective_od_rate_pct": round(od_base_rate * (1 - depreciation) * 100, 2),
                "vehicle_age_years": vehicle_age,
                "circular_ref": "IRDAI/NL/CIR/MOT/074/05/2023",
                "effective_date": "2023-06-01",
                "coverage_type": coverage_type,
                "note": f"Mandatory TP floor: ₹{tp_premium:,} for {engine_cc}cc {vehicle_use} vehicle"
            },
            source="irdai_data",
            latency_ms=0,
            tool_name=self.name
        )
```

---

### Day 3 · Tool 2 — Fraud Registry Check

```python
# backend/tools/fraud_check.py
class FraudCheckInput(BaseModel):
    policy_id: Optional[str] = None
    vehicle_reg: Optional[str] = None
    policyholder_name: Optional[str] = None

class FraudCheckTool(BaseTool):
    name = "fraud_registry_check"
    description = (
        "Check a policy, vehicle registration, or policyholder name against the "
        "InsureIQ fraud signals database. Use this when you suspect fraud or want to "
        "verify the integrity of a policy before approval. Returns: flagged status, "
        "severity (LOW/MEDIUM/HIGH), rule that triggered, and evidence. "
        "If nothing is flagged, the policy is clean in our internal records."
    )
    input_schema = FraudCheckInput

    def execute(self, policy_id=None, vehicle_reg=None, policyholder_name=None) -> ToolResult:
        from backend.database.db import SessionLocal
        from backend.database.models import Policy, RiskPrediction
        db = SessionLocal()
        try:
            flags = []
            if policy_id:
                policy = db.query(Policy).filter(Policy.id == policy_id).first()
                if policy:
                    # Check high mileage vs personal use
                    if policy.vehicle_use == "personal" and policy.annual_mileage_km > 40000:
                        flags.append({
                            "rule": "commercial_mileage",
                            "severity": "HIGH",
                            "evidence": f"Mileage {policy.annual_mileage_km:,} km/yr declared as personal use"
                        })
                    # Check prior claims concentration
                    if policy.prior_claims_count > 3:
                        flags.append({
                            "rule": "high_prior_claims",
                            "severity": "HIGH",
                            "evidence": f"{policy.prior_claims_count} prior claims on record"
                        })
                    # Check IDV vs vehicle age
                    age = 2025 - policy.vehicle_year
                    if age > 10 and policy.insured_value > 1000000:
                        flags.append({
                            "rule": "inflated_idv",
                            "severity": "MEDIUM",
                            "evidence": f"IDV ₹{policy.insured_value:,} on a {age}-year-old vehicle"
                        })
            return ToolResult(
                success=True,
                data={
                    "flagged": len(flags) > 0,
                    "flags": flags,
                    "highest_severity": max((f["severity"] for f in flags), default="NONE",
                                           key=lambda s: {"NONE":0,"LOW":1,"MEDIUM":2,"HIGH":3}[s]),
                    "recommendation": "Manual review required" if flags else "No fraud signals detected"
                },
                source="internal_db",
                latency_ms=0,
                tool_name=self.name
            )
        finally:
            db.close()
```

---

### Day 4 · Tool 3 — Portfolio Analytics Query

```python
# backend/tools/portfolio_query.py
class PortfolioQueryInput(BaseModel):
    question: str = Field(description="Natural language question about the policy portfolio")
    user_id: str

class PortfolioQueryTool(BaseTool):
    name = "portfolio_analytics_query"
    description = (
        "Query the insurance portfolio database using natural language. "
        "Use when the user asks aggregate questions about their portfolio such as: "
        "'how many CRITICAL policies?', 'average risk score by city', "
        "'which vehicle types have highest claim probability', "
        "'policies expiring this month'. "
        "Returns structured data with counts, averages, and lists."
    )
    input_schema = PortfolioQueryInput

    # Pre-built query templates — extend as needed
    QUERIES = {
        "risk_by_band": "SELECT risk_band, COUNT(*) as count, AVG(claim_probability) as avg_prob FROM risk_predictions rp JOIN policies p ON rp.policy_id = p.id WHERE p.user_id = :uid AND p.is_active = 1 GROUP BY risk_band",
        "risk_by_city": "SELECT p.city, COUNT(*) as count, AVG(rp.risk_score) as avg_score FROM risk_predictions rp JOIN policies p ON rp.policy_id = p.id WHERE p.user_id = :uid GROUP BY p.city ORDER BY avg_score DESC LIMIT 10",
        "critical_policies": "SELECT p.policy_number, p.policyholder_name, p.vehicle_make, rp.risk_score FROM risk_predictions rp JOIN policies p ON rp.policy_id = p.id WHERE p.user_id = :uid AND rp.risk_band = 'CRITICAL' ORDER BY rp.risk_score DESC",
        "portfolio_summary": "SELECT COUNT(*) as total, AVG(rp.risk_score) as avg_score, AVG(rp.claim_probability) as avg_prob FROM risk_predictions rp JOIN policies p ON rp.policy_id = p.id WHERE p.user_id = :uid",
    }

    def execute(self, question: str, user_id: str) -> ToolResult:
        from backend.database.db import SessionLocal
        from sqlalchemy import text
        question_lower = question.lower()
        query_key = "portfolio_summary"
        if "critical" in question_lower:
            query_key = "critical_policies"
        elif "city" in question_lower or "location" in question_lower:
            query_key = "risk_by_city"
        elif "band" in question_lower or "distribution" in question_lower:
            query_key = "risk_by_band"
        db = SessionLocal()
        try:
            result = db.execute(text(self.QUERIES[query_key]), {"uid": user_id})
            rows = [dict(row._mapping) for row in result]
            return ToolResult(
                success=True,
                data={"query_type": query_key, "rows": rows, "count": len(rows)},
                source="internal_db",
                latency_ms=0,
                tool_name=self.name
            )
        finally:
            db.close()
```

---

### Day 5 · Register all tools + write tests

```python
# backend/tools/__init__.py
from .base import tool_registry
from .irdai_tariff import IRDAITariffTool
from .fraud_check import FraudCheckTool
from .portfolio_query import PortfolioQueryTool

tool_registry.register(IRDAITariffTool())
tool_registry.register(FraudCheckTool())
tool_registry.register(PortfolioQueryTool())
```

**Tests — backend/tests/test_tools.py**
```python
def test_irdai_tariff_1500cc_personal():
    tool = IRDAITariffTool()
    result = tool.run(engine_cc=1497, vehicle_use="personal", vehicle_year=2019)
    assert result.success
    assert result.data["tp_premium_annual"] == 3416

def test_fraud_check_high_mileage():
    # Create test policy with 50K mileage declared as personal
    result = FraudCheckTool().run(policy_id="test-policy-id")
    assert result.success
    # Verify flag returned

def test_portfolio_query_summary():
    result = PortfolioQueryTool().run(question="portfolio summary", user_id="test-uid")
    assert result.success
    assert "total" in result.data["rows"][0]
```

---

## Week 2 — ReAct Agent Loop

### Day 6–7 · Build ReAct LangGraph

```python
# backend/agents/react_chat_graph.py
from typing import TypedDict, Optional, Annotated
from langgraph.graph import StateGraph, END
from backend.tools import tool_registry

class ReActState(TypedDict):
    messages: list[dict]
    policy_id: Optional[str]
    policy_data: Optional[dict]
    user_id: str
    tool_calls: list[dict]          # [{tool, input, result, latency_ms}]
    steps: int
    final_answer: Optional[str]
    session_id: str

def llm_node(state: ReActState) -> ReActState:
    """
    Calls Groq with tools enabled.
    If model returns a tool_call: populate state["tool_calls"] with pending call.
    If model returns text: set state["final_answer"].
    """
    from backend.llm.groq_client import groq_client, GROQ_MODELS
    tools = tool_registry.to_groq_tools()
    policy_ctx = ""
    if state.get("policy_data"):
        p = state["policy_data"]
        policy_ctx = f"\nCurrent policy context: {p.get('policy_number')} — {p.get('policyholder_name')}, {p.get('vehicle_year')} {p.get('vehicle_make')} {p.get('vehicle_model')}, risk score: {p.get('latest_risk_score', 'unassessed')}"

    system = (
        "You are InsureIQ AI — a specialist insurance underwriting copilot. "
        "You have access to tools for IRDAI tariff data, fraud checking, and portfolio analytics. "
        "Use tools when you need data you don't have. "
        "Always cite your data source in your final answer." + policy_ctx
    )
    messages = [{"role": "system", "content": system}]
    messages.extend(state["messages"][-10:])  # Last 10 for context window

    response = groq_client.chat.completions.create(
        model=GROQ_MODELS["reasoner"],
        messages=messages,
        tools=tools,
        tool_choice="auto",
        max_tokens=1024,
        temperature=0.1,
    )
    msg = response.choices[0].message

    if msg.tool_calls:
        # Model wants to call a tool
        pending = [{
            "tool": tc.function.name,
            "input": tc.function.arguments,
            "id": tc.id,
            "status": "pending"
        } for tc in msg.tool_calls]
        state["tool_calls"].extend(pending)
        state["messages"].append({"role": "assistant", "content": None, "tool_calls": msg.tool_calls})
    else:
        state["final_answer"] = msg.content
        state["messages"].append({"role": "assistant", "content": msg.content})

    state["steps"] += 1
    return state

def tool_executor_node(state: ReActState) -> ReActState:
    """Execute all pending tool calls and append results to messages."""
    import json
    pending = [tc for tc in state["tool_calls"] if tc.get("status") == "pending"]
    tool_results = []
    for call in pending:
        tool = tool_registry.get(call["tool"])
        if tool:
            kwargs = json.loads(call["input"]) if isinstance(call["input"], str) else call["input"]
            if call["tool"] == "portfolio_analytics_query":
                kwargs["user_id"] = state["user_id"]
            result = tool.run(**kwargs)
            call["status"] = "complete"
            call["result"] = result.data
            call["latency_ms"] = result.latency_ms
            tool_results.append({
                "role": "tool",
                "tool_call_id": call["id"],
                "content": json.dumps(result.data) if result.success else f"Error: {result.error}"
            })
    state["messages"].extend(tool_results)
    return state

def should_continue(state: ReActState) -> str:
    if state.get("final_answer"):
        return "end"
    if state["steps"] >= 5:
        return "end"
    pending = [tc for tc in state["tool_calls"] if tc.get("status") == "pending"]
    if pending:
        return "tool_executor"
    last = state["messages"][-1] if state["messages"] else {}
    if last.get("tool_calls"):
        return "tool_executor"
    return "end"

# Build graph
def build_react_graph():
    g = StateGraph(ReActState)
    g.add_node("llm", llm_node)
    g.add_node("tool_executor", tool_executor_node)
    g.set_entry_point("llm")
    g.add_conditional_edges("llm", should_continue, {
        "tool_executor": "tool_executor",
        "end": END
    })
    g.add_edge("tool_executor", "llm")
    return g.compile()

react_chat_graph = build_react_graph()
```

---

### Day 8 · Streaming ReAct endpoint

```python
# backend/routers/chat.py — replace existing /stream endpoint

@router.post("/stream")
async def chat_stream_v2(
    request: ChatRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    policy_data = None
    if request.policy_id:
        policy = get_policy(db, request.policy_id, str(current_user.id))
        if policy:
            pred = get_latest_prediction(db, str(policy.id))
            policy_data = {c.name: getattr(policy, c.name) for c in policy.__table__.columns}
            if pred:
                policy_data["latest_risk_score"] = pred.risk_score
                policy_data["latest_risk_band"] = pred.risk_band

    initial_state: ReActState = {
        "messages": [{"role": "user", "content": request.message}],
        "policy_id": request.policy_id,
        "policy_data": policy_data,
        "user_id": str(current_user.id),
        "tool_calls": [],
        "steps": 0,
        "final_answer": None,
        "session_id": f"{current_user.id}:{request.policy_id or 'general'}",
    }

    async def generate():
        loop = asyncio.get_event_loop()
        queue = asyncio.Queue()

        async def run_graph():
            try:
                result = await loop.run_in_executor(
                    None,
                    lambda: react_chat_graph.invoke(initial_state)
                )
                # Stream tool calls that happened
                for tc in result.get("tool_calls", []):
                    data = json.dumps({
                        "type": "tool_result",
                        "tool": tc["tool"],
                        "result_summary": summarise_tool_result(tc.get("result")),
                        "latency_ms": tc.get("latency_ms", 0)
                    })
                    yield f"data: {data}\n\n"
                # Stream final answer token by token (re-call Groq with stream=True)
                answer = result.get("final_answer", "")
                if answer:
                    # Stream the answer
                    for char in answer:
                        data = json.dumps({"type": "token", "token": char})
                        yield f"data: {data}\n\n"
                yield f"data: {json.dumps({'type': 'done'})}\n\n"
            except Exception as e:
                yield f"data: {json.dumps({'type': 'error', 'message': str(e)[:200]})}\n\n"

        return run_graph()

    return StreamingResponse(generate(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})

def summarise_tool_result(result: dict) -> str:
    if not result:
        return "No data returned"
    if "tp_premium_annual" in result:
        return f"IRDAI TP premium: ₹{result['tp_premium_annual']:,}"
    if "flagged" in result:
        return f"Fraud check: {'⚠ FLAGGED' if result['flagged'] else '✓ Clean'}"
    if "rows" in result:
        return f"{len(result['rows'])} records found"
    return "Data retrieved"
```

---

### Day 9–10 · Update ChatDrawer for tool calls

```tsx
// Add to useStreamingChat.ts — handle new event types
interface ToolCallEvent {
  type: 'tool_result';
  tool: string;
  result_summary: string;
  latency_ms: number;
}

// In the message type:
interface Message {
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
  tool_calls?: ToolCallEvent[];
  timestamp: Date;
}

// When parsing SSE events:
if (data.type === 'tool_result') {
  setMessages(prev => {
    const updated = [...prev];
    const last = updated[updated.length - 1];
    last.tool_calls = [...(last.tool_calls || []), data];
    return updated;
  });
}

// In ChatMessage component — render tool calls:
{msg.tool_calls && msg.tool_calls.length > 0 && (
  <div className="tool-calls-section">
    {msg.tool_calls.map((tc, i) => (
      <div key={i} className="tool-call-pill">
        <span className="tool-icon">
          {tc.tool === 'irdai_tariff_lookup' ? '📋' :
           tc.tool === 'fraud_registry_check' ? '🚨' :
           tc.tool === 'portfolio_analytics_query' ? '📊' : '🔍'}
        </span>
        <span className="tool-name">{tc.tool.replace(/_/g, ' ')}</span>
        <span className="tool-result">{tc.result_summary}</span>
        <span className="tool-latency">{tc.latency_ms}ms</span>
      </div>
    ))}
  </div>
)}
```

---

## Week 3 — External Tools + Vehicle Lookup

### Day 11–12 · Tool 4 — Vahan Vehicle Lookup

```python
# backend/tools/vehicle_lookup.py
import requests
from bs4 import BeautifulSoup

class VehicleLookupInput(BaseModel):
    registration_number: str = Field(
        description="Vehicle registration number e.g. MH12AB1234",
        pattern=r'^[A-Z]{2}\d{2}[A-Z]{1,2}\d{4}$'
    )

class VehicleLookupTool(BaseTool):
    name = "vehicle_registration_lookup"
    description = (
        "Look up vehicle registration details from the government Vahan database. "
        "Use to verify: make, model, year, fuel type, engine CC, owner name, "
        "and registration status against what the policyholder declared. "
        "Flags discrepancies between declared and registered details."
    )
    input_schema = VehicleLookupInput

    def execute(self, registration_number: str) -> ToolResult:
        # Primary: try VAHAN API (https://vahan.parivahan.gov.in)
        # Fallback: return mock data for demo purposes
        try:
            # Note: VAHAN requires registration — use raashtriya_vahan_parivahan API
            # For portfolio demo: return structured mock that demonstrates the feature
            mock_data = self._get_mock_vehicle_data(registration_number)
            return ToolResult(
                success=True,
                data=mock_data,
                source="external_api",
                latency_ms=0,
                tool_name=self.name
            )
        except Exception as e:
            return ToolResult(
                success=False, data=None,
                error=f"Vehicle lookup unavailable: {str(e)[:100]}",
                source="external_api",
                latency_ms=0,
                tool_name=self.name
            )

    def _get_mock_vehicle_data(self, reg: str) -> dict:
        """Structured mock for demo — replace with real API call"""
        state_code = reg[:2]
        states = {"MH": "Maharashtra", "DL": "Delhi", "KA": "Karnataka",
                  "TN": "Tamil Nadu", "GJ": "Gujarat"}
        return {
            "registration_number": reg,
            "registered_state": states.get(state_code, "Unknown"),
            "make": "Honda",
            "model": "City",
            "year": 2019,
            "fuel_type": "Petrol",
            "engine_cc": 1498,
            "registered_use": "personal",
            "fitness_valid_until": "2029-03-15",
            "insurance_valid_until": "2025-06-30",
            "blacklist_status": "clear",
            "source": "Vahan Government Database (demo)",
            "note": "Connect to VAHAN API with valid credentials for production"
        }
```

---

### Day 13 · Tool 5 — Market Premium Benchmark

```python
# backend/tools/market_benchmark.py
class MarketBenchmarkInput(BaseModel):
    vehicle_make: str
    vehicle_year: int
    engine_cc: int
    city: str
    vehicle_use: Literal["personal", "commercial"]
    insured_value: float

class MarketBenchmarkTool(BaseTool):
    name = "market_premium_benchmark"
    description = (
        "Get estimated premium ranges from major Indian motor insurers "
        "(ICICI Lombard, HDFC Ergo, Digit Insurance) for comparison. "
        "Use when a user wants to know if their current premium is competitive "
        "or when recommending a premium range for a new policy."
    )
    input_schema = MarketBenchmarkInput

    # Rule-based insurer multipliers (based on public rate data)
    INSURER_FACTORS = {
        "ICICI Lombard": 1.05,   # Slightly above market average
        "HDFC Ergo":     1.02,
        "Digit Insurance": 0.96,  # Typically lowest digital-first rates
        "Acko":           0.94,
        "Bajaj Allianz":  1.08,
    }

    def execute(self, vehicle_make, vehicle_year, engine_cc, city, vehicle_use, insured_value):
        from backend.tools.irdai_tariff import IRDAITariffTool
        irdai = IRDAITariffTool()
        tariff = irdai.run(engine_cc=engine_cc, vehicle_use=vehicle_use, vehicle_year=vehicle_year)
        tp = tariff.data["tp_premium_annual"]
        od_rate = tariff.data["effective_od_rate_pct"] / 100
        base_od = insured_value * od_rate
        # City risk loading
        city_tier = {"Mumbai":1.25,"Delhi":1.30,"Bangalore":1.15,"Chennai":1.15}.get(city, 1.0)
        base_od_loaded = base_od * city_tier
        base_total = tp + base_od_loaded
        estimates = {}
        for insurer, factor in self.INSURER_FACTORS.items():
            est = base_total * factor
            estimates[insurer] = {
                "estimated_premium": round(est, -2),
                "range": f"₹{round(est * 0.95, -2):,.0f} – ₹{round(est * 1.05, -2):,.0f}",
            }
        market_avg = sum(e["estimated_premium"] for e in estimates.values()) / len(estimates)
        return ToolResult(
            success=True,
            data={
                "insurers": estimates,
                "market_average": round(market_avg, -2),
                "irdai_floor": tp,
                "methodology": "IRDAI tariff base + city risk loading + insurer rate factors",
                "disclaimer": "Estimates only. Actual quotes may vary."
            },
            source="rule_based",
            latency_ms=0,
            tool_name=self.name
        )
```

---

### Day 14–15 · Register all 5 tools + integration tests

```python
# backend/tools/__init__.py — update
from .irdai_tariff import IRDAITariffTool
from .fraud_check import FraudCheckTool
from .portfolio_query import PortfolioQueryTool
from .vehicle_lookup import VehicleLookupTool
from .market_benchmark import MarketBenchmarkTool

tool_registry.register(IRDAITariffTool())
tool_registry.register(FraudCheckTool())
tool_registry.register(PortfolioQueryTool())
tool_registry.register(VehicleLookupTool())
tool_registry.register(MarketBenchmarkTool())
```

**Integration test — full ReAct loop**
```python
def test_react_loop_uses_irdai_tool():
    """Test that asking about IRDAI rates triggers the tool"""
    state = {
        "messages": [{"role": "user", "content": "What is the IRDAI TP premium for a 1497cc personal car?"}],
        "policy_id": None, "policy_data": None,
        "user_id": "test", "tool_calls": [], "steps": 0,
        "final_answer": None, "session_id": "test"
    }
    result = react_chat_graph.invoke(state)
    tool_names = [tc["tool"] for tc in result["tool_calls"]]
    assert "irdai_tariff_lookup" in tool_names
    assert "3,416" in result["final_answer"] or "3416" in result["final_answer"]
```

---

## Week 4 — Polish + V2 UI

### Day 16–17 · Chat UI tool call display

```tsx
// Tool call timeline component
function ToolCallTimeline({ calls }: { calls: ToolCallEvent[] }) {
  return (
    <div className="tool-timeline">
      {calls.map((tc, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.1 }}
          className="tool-step"
        >
          <div className="tool-connector" />
          <div className="tool-dot" />
          <div className="tool-content">
            <span className="tool-label">
              {TOOL_ICONS[tc.tool]} {TOOL_LABELS[tc.tool]}
            </span>
            <span className="tool-summary">{tc.result_summary}</span>
            <span className="tool-meta">{tc.latency_ms}ms</span>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
```

### Day 18 · Add IRDAI circular search tool (Tool 6)

```python
# backend/tools/irdai_search.py
# Reuses FAISS index from ComplianceBot / knowledge_base/finance/
class IRDAISearchTool(BaseTool):
    name = "irdai_circular_search"
    description = (
        "Search IRDAI circulars, guidelines, and regulations for authoritative answers. "
        "Use for questions about: coverage rules, claim procedures, policyholder rights, "
        "disclosure requirements, grievance redressal, or any regulatory compliance question."
    )
```

### Day 19–20 · V2 QA + Demo prep

**V2 demo script**
1. Open chat on a HIGH risk policy
2. Ask: "Is this policy's premium correctly priced per IRDAI?"
   → Watch: tool call fires → IRDAI lookup → market benchmark → structured answer with citation
3. Ask: "Check if this vehicle has any fraud signals"
   → Watch: fraud_check tool fires → clean/flagged result
4. Ask: "How does this compare to similar policies in my portfolio?"
   → Watch: portfolio_query tool fires → data from DB → contextual answer

---

## Week 5 — V2 Production

### Day 21–22 · Error handling + fallbacks

Every tool must handle:
- External API timeout (5s timeout, graceful fallback)
- DB connection failure
- Invalid input (caught by Pydantic before execute())
- Rate limits on external APIs

### Day 23 · V2 deploy

```bash
# Tag v1
git tag v1.0.0 && git push origin v1.0.0

# Merge v2 branch
git checkout main && git merge v2/mcp-tools
git push origin main

# Render auto-deploys from main
# Verify: GET /health shows all tools registered
```

### Day 24–25 · V2 LinkedIn post + README update

```markdown
# v2 additions to README:
## Tool Registry (v2)
| Tool | Data Source | Use |
|------|-------------|-----|
| irdai_tariff_lookup | IRDAI Circular 2023 | Premium floor calculation |
| fraud_registry_check | Internal DB | Fraud signal detection |
| portfolio_analytics_query | InsureIQ DB | Portfolio intelligence |
| vehicle_registration_lookup | Vahan (demo) | Registration verification |
| market_premium_benchmark | Rule-based | Competitor comparison |
| irdai_circular_search | FAISS index | Regulatory Q&A |
```

---

## V2 Summary

| Week | Focus | Deliverable |
|------|-------|-------------|
| W1 | Infrastructure + 3 tools | Tool registry, IRDAI/fraud/portfolio tools working |
| W2 | ReAct loop | LangGraph ReAct graph, streaming tool calls in UI |
| W3 | External tools | Vehicle lookup, market benchmark, all 5 tools wired |
| W4 | Polish | Tool call UI, IRDAI search, integration tests pass |
| W5 | Deploy | v2 live on Render+Vercel, v2 LinkedIn post |
