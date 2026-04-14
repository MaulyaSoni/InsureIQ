import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AlertCircle, RefreshCw, FileText, ArrowRight } from "lucide-react";
import { getRenewalUpcoming, getRenewalAdvisory } from "@/lib/advancedApi";

export default function RenewalTab() {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: upcoming, isLoading } = useQuery({
    queryKey: ["renewalUpcoming"],
    queryFn: getRenewalUpcoming,
  });

  const { data: advisory, isLoading: isLoadingAdvisory } = useQuery({
    queryKey: ["renewalAdvisory", selectedId],
    queryFn: () => getRenewalAdvisory(selectedId!),
    enabled: !!selectedId,
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="nu-card bg-[#0E1118] border border-[#1E2535] p-6">
        <div className="flex items-center gap-3 mb-4">
          <AlertCircle size={20} className="text-[#FFB300]" />
          <h2 className="font-mono-ibm text-[15px] font-semibold text-[#F0F4FF]">
            Upcoming Renewals & Lapse Risk
          </h2>
        </div>
        <p className="text-sm text-[#8A95B0] mb-6">
          Policies expiring in the next 60 days, scored for renewal risk and premium adjustment.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Table */}
          <div className="border border-[#1E2535] rounded-lg overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-[#1E2535] text-[#8A95B0] text-xs font-mono-ibm">
                  <th className="p-3 font-semibold">Policy No.</th>
                  <th className="p-3 font-semibold">Expiry Date</th>
                  <th className="p-3 font-semibold">Renewal Score</th>
                  <th className="p-3 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E2535] text-sm text-[#F0F4FF]">
                {isLoading ? (
                  <tr><td colSpan={4} className="p-4 text-center text-[#8A95B0]">Fetching upcoming...</td></tr>
                ) : !Array.isArray(upcoming) || upcoming.length === 0 ? (
                  <tr><td colSpan={4} className="p-4 text-center text-[#8A95B0]">No policies expiring in 60 days.</td></tr>
                ) : (
                  upcoming.map((item: any) => (
                    <tr 
                      key={item.id}
                      className={`hover:bg-[#0B0D14] cursor-pointer ${selectedId === item.id ? 'bg-[#00D4FF]/10' : ''}`}
                      onClick={() => setSelectedId(item.id)}
                    >
                      <td className="p-3 font-mono-ibm text-xs">{item.policy_number}</td>
                      <td className="p-3 text-xs">{new Date(item.expiry_date).toLocaleDateString()}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                           <div className="w-full bg-[#1E2535] h-1.5 rounded-full overflow-hidden max-w-[80px]">
                              <div className="h-full bg-[#00D4FF]" style={{ width: `${item.renewal_risk_score}%` }}></div>
                           </div>
                           <span className="text-[10px] font-mono-ibm">{item.renewal_risk_score}</span>
                        </div>
                      </td>
                      <td className="p-3">
                        <button className="text-[#00D4FF] hover:text-[#00D4FF]/80 text-xs flex items-center gap-1">
                          Advisory <ArrowRight size={12} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Advisory Panel */}
          <div className="bg-[#0B0D14] min-h-[300px] border border-[#1E2535] rounded-lg p-5">
            {!selectedId ? (
              <div className="flex items-center justify-center h-full text-[#8A95B0] flex-col gap-2">
                <FileText size={32} />
                <span className="text-sm">Select a policy to view neural advisory</span>
              </div>
            ) : isLoadingAdvisory ? (
              <div className="flex items-center justify-center h-full text-[#8A95B0] flex-col gap-4">
                <RefreshCw size={24} className="animate-spin text-[#00D4FF]" />
                <span className="text-sm">Generating advisory via Mixtral-8x7B...</span>
              </div>
            ) : (
              <div className="animate-in fade-in duration-300 h-full flex flex-col">
                <div className="flex items-center gap-2 mb-4 text-[#00D4FF]">
                  <BrainCircuit size={16} />
                  <span className="font-mono-ibm text-xs font-semibold uppercase tracking-wider">Renewal Strategy Narrative</span>
                </div>
                <div className="flex-1 overflow-y-auto text-sm text-[#8A95B0] leading-relaxed space-y-3">
                   {advisory?.narrative?.split('\n\n').map((para: string, i: number) => (
                     <p key={i}>{para}</p>
                   )) || "System advisory generated but content is empty."}
                </div>
                <div className="mt-4 pt-4 border-t border-[#1E2535] flex items-center justify-between">
                   <div className="text-xs text-[#F0F4FF]">Recommended action logged to CRM auto-mailer.</div>
                   <button className="nu-btn-primary !px-4 !py-1.5 !text-xs">Execute Email</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function BrainCircuit(props: any) {
  // SVG placeholder inside since lucide import might miss BrainCircuit due to version
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M12 4.5a2.5 2.5 0 0 0-4.96-.46 2.5 2.5 0 0 0-1.98 3 2.5 2.5 0 0 0-1.32 4.24 3 3 0 0 0 .34 5.58 2.5 2.5 0 0 0 2.96 3.08 2.5 2.5 0 0 0 4.91.05L12 20V4.5z"/><path d="M16 8V5c0-1.1.9-2 2-2"/><path d="M12 13h4"/><path d="M12 17h6"/><path d="M19 13v4"/><path d="M18 5h3"/></svg>
}
