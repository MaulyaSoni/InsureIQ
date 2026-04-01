import jsPDF from "jspdf";
import type { UnderwritingReport } from "@/types/insurance";
import { getPolicy } from "@/lib/api";

export async function exportReportPDF(report: UnderwritingReport) {
  const policy = await getPolicy(report.policy_id);
  const doc = new jsPDF();
  const w = doc.internal.pageSize.getWidth();
  let y = 20;

  const addLine = (label: string, value: string, indent = 14) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(label, indent, y);
    doc.setFont("helvetica", "normal");
    doc.text(value, indent + 55, y);
    y += 7;
  };

  const addSection = (title: string) => {
    if (y > 250) { doc.addPage(); y = 20; }
    y += 4;
    doc.setFillColor(30, 41, 59);
    doc.rect(14, y - 5, w - 28, 8, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(title, 16, y);
    doc.setTextColor(0, 0, 0);
    y += 10;
  };

  // Header
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 41, 59);
  doc.text("InsureIQ — Underwriting Report", 14, y);
  y += 8;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text(`Report ID: ${report.id}  |  Generated: ${new Date(report.generated_at).toLocaleString()}`, 14, y);
  y += 4;
  doc.setDrawColor(200);
  doc.line(14, y, w - 14, y);
  y += 8;
  doc.setTextColor(0, 0, 0);

  // Recommendation badge
  const rec = report.recommendation.toUpperCase();
  const recColor: Record<string, [number, number, number]> = {
    APPROVE: [34, 197, 94], REVIEW: [234, 179, 8], REJECT: [239, 68, 68],
  };
  const c = recColor[rec] || [100, 100, 100];
  doc.setFillColor(c[0], c[1], c[2]);
  doc.roundedRect(14, y - 5, 40, 9, 2, 2, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(rec, 16, y + 1);
  doc.setTextColor(0, 0, 0);
  y += 14;

  // Policy Details
  if (policy) {
    addSection("Policy Details");
    addLine("Policy #", policy.policy_number);
    addLine("Holder", policy.holder_name);
    addLine("Vehicle", `${policy.vehicle_make} ${policy.vehicle_model} (${policy.production_year})`);
    addLine("Type / Usage", `${policy.vehicle_type} / ${policy.usage_type}`);
    addLine("Insured Value", `₹${policy.insured_value.toLocaleString("en-IN")}`);
    addLine("Premium", `₹${policy.premium_amount.toLocaleString("en-IN")}`);
    addLine("Prior Claims", String(policy.prior_claims));
    addLine("Region", policy.region);
  }

  // Executive Summary
  addSection("Executive Summary");
  doc.setFontSize(9);
  const summaryLines = doc.splitTextToSize(report.summary, w - 32);
  doc.text(summaryLines, 14, y);
  y += summaryLines.length * 5 + 4;

  // Risk Assessment
  addSection("Risk Assessment");
  addLine("Risk Score", `${report.risk_assessment.risk_score}/100`);
  addLine("Risk Band", report.risk_assessment.risk_band.toUpperCase());
  addLine("Claim Probability", `${(report.risk_assessment.claim_probability * 100).toFixed(1)}%`);
  y += 2;
  doc.setFontSize(9);
  const explLines = doc.splitTextToSize(report.risk_assessment.explanation, w - 32);
  doc.text(explLines, 14, y);
  y += explLines.length * 5 + 4;

  // SHAP Features
  if (report.risk_assessment.top_features.length > 0) {
    addSection("SHAP Feature Importance");
    doc.setFontSize(9);
    for (const f of report.risk_assessment.top_features) {
      addLine(f.feature_name, `SHAP: ${f.shap_value.toFixed(3)} | Value: ${f.feature_value} | ${f.direction}`);
    }
  }

  // Claim Prediction
  if (y > 240) { doc.addPage(); y = 20; }
  addSection("Claim Prediction");
  addLine("Predicted Amount", `₹${report.claim_prediction.predicted_claim_amount.toLocaleString("en-IN")}`);
  addLine("Confidence", `₹${report.claim_prediction.confidence_interval.lower.toLocaleString("en-IN")} – ₹${report.claim_prediction.confidence_interval.upper.toLocaleString("en-IN")}`);
  addLine("Claim Probability", `${(report.claim_prediction.claim_probability * 100).toFixed(1)}%`);
  addLine("Model Version", report.claim_prediction.model_version);
  if (report.claim_prediction.risk_factors.length > 0) {
    y += 2;
    doc.setFont("helvetica", "bold");
    doc.text("Risk Factors:", 14, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    for (const rf of report.claim_prediction.risk_factors) {
      doc.text(`• ${rf}`, 18, y);
      y += 5;
    }
  }

  // Premium Advisory
  if (y > 240) { doc.addPage(); y = 20; }
  addSection("Premium Advisory");
  addLine("Current Premium", `₹${report.premium_advisory.current_premium.toLocaleString("en-IN")}`);
  addLine("Recommended", `₹${report.premium_advisory.recommended_premium.toLocaleString("en-IN")}`);
  addLine("Range", `₹${report.premium_advisory.premium_range.min.toLocaleString("en-IN")} – ₹${report.premium_advisory.premium_range.max.toLocaleString("en-IN")}`);
  y += 2;
  doc.setFontSize(9);
  const justLines = doc.splitTextToSize(report.premium_advisory.justification, w - 32);
  doc.text(justLines, 14, y);
  y += justLines.length * 5 + 6;

  // Footer
  doc.setFontSize(7);
  doc.setTextColor(150);
  doc.text("Generated by InsureIQ — Powered by Vishleshak AI", 14, 290);
  doc.text(`Page 1 of ${doc.getNumberOfPages()}`, w - 40, 290);

  doc.save(`InsureIQ_Report_${report.id}.pdf`);
}
