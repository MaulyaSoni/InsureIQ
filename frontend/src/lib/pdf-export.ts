import type { UnderwritingReport } from "@/types/insurance";

export function exportReportPDF(report: UnderwritingReport) {
  const content = `
INSUREIQ UNDERWRITING REPORT
============================
Report ID: ${report.id}
Generated: ${new Date(report.generated_at).toLocaleString("en-IN")}
Policy ID: ${report.policy_id}

RECOMMENDATION: ${report.recommendation.toUpperCase()}

EXECUTIVE SUMMARY
-----------------
${report.summary}

RISK ASSESSMENT
---------------
Risk Score: ${report.risk_assessment.risk_score}/100
Risk Band: ${report.risk_assessment.risk_band.toUpperCase()}
Claim Probability: ${(report.risk_assessment.claim_probability * 100).toFixed(1)}%
Explanation: ${report.risk_assessment.explanation}

CLAIM PREDICTION
----------------
Claim Probability: ${(report.claim_prediction.claim_probability * 100).toFixed(1)}%
Predicted Amount: ₹${report.claim_prediction.predicted_claim_amount.toLocaleString("en-IN")}
Model Version: ${report.claim_prediction.model_version}

PREMIUM ADVISORY
----------------
Current Premium: ₹${report.premium_advisory.current_premium.toLocaleString("en-IN")}
Recommended Premium: ₹${report.premium_advisory.recommended_premium.toLocaleString("en-IN")}
Range: ₹${report.premium_advisory.premium_range.min.toLocaleString("en-IN")} - ₹${report.premium_advisory.premium_range.max.toLocaleString("en-IN")}

${report.premium_advisory.justification}

---
AI-generated analysis. Verify with licensed insurance professionals before making underwriting decisions.
InsureIQ — Powered by Groq LLM + LangGraph Agents
`.trim();

  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `insureiq-report-${report.id}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
