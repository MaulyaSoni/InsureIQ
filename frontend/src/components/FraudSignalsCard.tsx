import { AlertTriangle, ShieldAlert } from "lucide-react";

export function FraudSignalsCard({ signals, isFlagged }: { signals?: string[], isFlagged?: boolean }) {
  if (!isFlagged && (!signals || signals.length === 0)) return null;

  return (
    <div className="bg-[#FF3B5C]/10 border border-[#FF3B5C]/30 rounded-lg p-4 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <ShieldAlert size={18} className="text-[#FF3B5C]" />
        <h3 className="font-mono-ibm text-sm text-[#FF3B5C] font-semibold uppercase tracking-wider">
          Warning: Potential Fraud Signals Detected
        </h3>
      </div>
      <p className="text-xs text-[#F0F4FF] mb-3">
        The system has flagged multiple anomalies that correspond to known behavioral risk patterns.
      </p>
      <ul className="space-y-2">
        {(signals || ["Multiple recent address changes", "Inconsistent stated income"]).map((signal, i) => (
          <li key={i} className="flex items-start gap-2 text-xs text-[#8A95B0]">
            <AlertTriangle size={12} className="text-[#FFB300] shrink-0 mt-0.5" />
            <span>{signal}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
