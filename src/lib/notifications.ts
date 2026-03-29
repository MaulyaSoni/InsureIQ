// ============================================================
// InsureIQ Notification System
// Real-time notifications for risk assessments, high-risk flags, etc.
// ============================================================

import { toast } from "sonner";
import type { RiskBand } from "@/types/insurance";

export interface InsureNotification {
  id: string;
  type: "risk_complete" | "high_risk_alert" | "policy_imported" | "report_ready" | "batch_complete";
  title: string;
  message: string;
  severity: "info" | "success" | "warning" | "critical";
  timestamp: string;
  read: boolean;
  policyId?: string;
}

const listeners: Array<(notifications: InsureNotification[]) => void> = [];
let notifications: InsureNotification[] = [];

function emit() {
  listeners.forEach((fn) => fn([...notifications]));
}

export function subscribeNotifications(fn: (n: InsureNotification[]) => void) {
  listeners.push(fn);
  fn([...notifications]);
  return () => {
    const idx = listeners.indexOf(fn);
    if (idx > -1) listeners.splice(idx, 1);
  };
}

export function getNotifications(): InsureNotification[] {
  return [...notifications];
}

export function markRead(id: string) {
  notifications = notifications.map((n) => (n.id === id ? { ...n, read: true } : n));
  emit();
}

export function markAllRead() {
  notifications = notifications.map((n) => ({ ...n, read: true }));
  emit();
}

export function clearNotifications() {
  notifications = [];
  emit();
}

export function pushNotification(n: Omit<InsureNotification, "id" | "timestamp" | "read">) {
  const notification: InsureNotification = {
    ...n,
    id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
    read: false,
  };
  notifications = [notification, ...notifications].slice(0, 50);
  emit();

  // Also fire a sonner toast for immediate visibility
  const toastFn =
    n.severity === "critical" ? toast.error :
    n.severity === "warning" ? toast.warning :
    n.severity === "success" ? toast.success :
    toast.info;

  toastFn(n.title, { description: n.message, duration: 5000 });

  return notification;
}

// --- Convenience helpers called from API layer ---

export function notifyRiskComplete(policyNumber: string, riskBand: RiskBand, riskScore: number, policyId?: string) {
  const isHighRisk = riskBand === "high" || riskBand === "critical";

  pushNotification({
    type: "risk_complete",
    title: "Risk Assessment Complete",
    message: `${policyNumber} scored ${riskScore}/100 (${riskBand.toUpperCase()})`,
    severity: "success",
    policyId,
  });

  if (isHighRisk) {
    pushNotification({
      type: "high_risk_alert",
      title: `⚠ High Risk Alert`,
      message: `${policyNumber} flagged as ${riskBand.toUpperCase()} risk — manual review recommended`,
      severity: riskBand === "critical" ? "critical" : "warning",
      policyId,
    });
  }
}

export function notifyReportReady(policyNumber: string, policyId?: string) {
  pushNotification({
    type: "report_ready",
    title: "Report Generated",
    message: `Underwriting report ready for ${policyNumber}`,
    severity: "info",
    policyId,
  });
}

export function notifyBatchComplete(count: number, highRiskCount: number) {
  pushNotification({
    type: "batch_complete",
    title: "Batch Analysis Complete",
    message: `${count} policies processed, ${highRiskCount} flagged high risk`,
    severity: highRiskCount > 0 ? "warning" : "success",
  });
}

export function notifyPoliciesImported(count: number) {
  pushNotification({
    type: "policy_imported",
    title: "Policies Imported",
    message: `${count} policies imported from CSV`,
    severity: "success",
  });
}
