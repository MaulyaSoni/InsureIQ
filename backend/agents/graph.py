from __future__ import annotations

from backend.agents.nodes.explainer_node import explainer_node
from backend.agents.nodes.premium_node import premium_node
from backend.agents.nodes.report_node import report_node
from backend.agents.nodes.risk_node import risk_node
from backend.agents.nodes.supervisor import supervisor_node
from backend.agents.state import InsureIQState

try:
    from langgraph.graph import END, StateGraph
except Exception:  # pragma: no cover - fallback path if langgraph unavailable
    END = "END"
    StateGraph = None


def _route_logic(state: InsureIQState):
    return state.get("route", "full_report")


if StateGraph is not None:
    workflow = StateGraph(InsureIQState)

    workflow.add_node("supervisor", supervisor_node)
    workflow.add_node("risk_node", risk_node)
    workflow.add_node("explainer_node", explainer_node)
    workflow.add_node("premium_node", premium_node)
    workflow.add_node("report_node", report_node)

    workflow.set_entry_point("supervisor")
    workflow.add_conditional_edges(
        "supervisor",
        _route_logic,
        {
            "risk_only": "risk_node",
            "risk_and_explain": "risk_node",
            "premium": "risk_node",
            "full_report": "risk_node",
            "explain_only": "explainer_node",
        },
    )

    workflow.add_conditional_edges(
        "risk_node",
        _route_logic,
        {
            "risk_only": END,
            "risk_and_explain": "explainer_node",
            "premium": "explainer_node",
            "full_report": "explainer_node",
            "explain_only": END,
        },
    )

    workflow.add_conditional_edges(
        "explainer_node",
        _route_logic,
        {
            "risk_only": END,
            "risk_and_explain": END,
            "premium": "premium_node",
            "full_report": "premium_node",
            "explain_only": END,
        },
    )

    workflow.add_conditional_edges(
        "premium_node",
        _route_logic,
        {
            "risk_only": END,
            "risk_and_explain": END,
            "premium": END,
            "full_report": "report_node",
            "explain_only": END,
        },
    )
    workflow.add_edge("report_node", END)

    insureiq_graph = workflow.compile()
else:
    class _FallbackGraph:
        def invoke(self, state: InsureIQState) -> InsureIQState:
            state = supervisor_node(state)
            route = state.get("route", "full_report")
            if route in {"risk_only", "risk_and_explain", "premium", "full_report"}:
                state = risk_node(state)
            if route in {"risk_and_explain", "premium", "full_report", "explain_only"}:
                state = explainer_node(state)
            if route in {"premium", "full_report"}:
                state = premium_node(state)
            if route == "full_report":
                state = report_node(state)
            return state

    insureiq_graph = _FallbackGraph()

