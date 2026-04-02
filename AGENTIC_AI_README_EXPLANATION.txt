INSUREIQ — AGENTIC AI ARCHITECTURE
===================================

InsureIQ is powered by an Agentic AI architecture built on LangGraph's StateGraph framework — not a simple LLM wrapper, but a genuine multi-agent system where specialized agents collaborate to make underwriting decisions.

THE CORE IDEA
-------------
Instead of calling a single LLM and hoping for the best, InsureIQ uses a Supervisor-Worker pattern. When you submit a policy for analysis, a Supervisor agent (powered by Groq's llama-3.1-8b-instant) reads the user's query and current system state, then intelligently routes the request to the right specialist agents: the Risk Node (XGBoost + SHAP), the Explainer Node (llama-3.3-70b), the Premium Advisor Node (mixtral-8x7b), and the Report Writer Node.

PERSISTENT SHARED STATE
------------------------
Every agent operates on the same InsureIQState TypedDict — a living shared brain that accumulates results. The Risk Node populates claim_probability and shap_features; the Explainer Node reads those values and adds risk_explanation; the Premium Advisor reads the risk output and computes premium recommendations. No data is lost between agents. No redundant computation. State flows through the graph like a pipeline with memory.

TOOL USE PATTERN
----------------
The Risk Node doesn't use an LLM for predictions — it calls the XGBoost model directly (a "tool"), and the SHAP explainer as another tool. This is deliberate: ML predictions are deterministic and precise, while the LLM handles interpretation, natural language explanation, and structured report generation. Each agent does what it's best at.

WHY THIS MATTERS FOR HIRING MANAGERS
-------------------------------------
This isn't prompt engineering. This is systems design. You built a StateGraph with conditional edges (5 route paths), implemented tool-use (XGBoost/SHAP as callable tools), managed persistent shared state across agent boundaries, and structured LLM outputs via Pydantic-validated responses — all the hallmarks of production-grade Agentic AI engineering.
