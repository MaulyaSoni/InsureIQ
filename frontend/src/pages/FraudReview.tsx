import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ShieldAlert, AlertTriangle, Eye, CheckCircle2, XCircle } from "lucide-react";
import { getFraudReviews, getFraudExplain } from "@/lib/advancedApi";

export default function FraudReview() {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: fraudList, isLoading } = useQuery({
    queryKey: ["fraudReviews"],
    queryFn: getFraudReviews,
  });

  const { data: explanation, isLoading: isLoadingExplain } = useQuery({
    queryKey: ["fraudExplain", selectedId],
    queryFn: () => getFraudExplain(selectedId!),
    enabled: !!selectedId,
  });

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="nu-page-title text-[#FF3B5C]">Fraud Investigation Review</h1>
          <p className="nu-page-subtitle">Policies flagged for suspicious patterns by the neural detection engine.</p>
        </div>
        <div className="nu-card px-4 py-2 border-[#FF3B5C]/30 bg-[#FF3B5C]/5 flex items-center gap-2">
          <ShieldAlert size={16} className="text-[#FF3B5C]" />
          <span className="font-mono-ibm text-sm text-[#FF3B5C] font-semibold">
            {fraudList?.length || 0} Open Cases
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* List */}
        <div className="nu-card p-0 flex flex-col min-h-[500px]">
          <div className="p-4 border-b border-[#1E2535]">
             <h2 className="font-mono-ibm text-sm font-semibold text-[#F0F4FF]">Flagged Policies</h2>
          </div>
          <div className="flex-1 divide-y divide-[#1E2535]">
            {isLoading ? (
              <div className="p-8 text-center text-[#8A95B0]">Scanning system records...</div>
            ) : fraudList?.length === 0 ? (
              <div className="p-8 text-center text-[#8A95B0]">No active fraud alerts detected.</div>
            ) : (
              fraudList?.map((item: any) => (
                <div 
                  key={item.policy_id} 
                  className={`p-4 cursor-pointer hover:bg-[#0E1118] transition-colors ${selectedId === item.policy_id ? 'bg-[#0E1118] border-l-2 border-[#FF3B5C]' : ''}`}
                  onClick={() => setSelectedId(item.policy_id)}
                >
                  <div className="flex items-center justify-between mb-2">
                     <div>
                        <div className="font-semibold text-[#F0F4FF]">{item.policy_number}</div>
                        <div className="text-xs text-[#8A95B0]">{item.policyholder_name}</div>
                     </div>
                     <span className="text-xs text-[#8A95B0]">{new Date(item.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {item.fraud_signals?.map((sig: any, i: number) => (
                      <span key={i} className="text-[10px] px-2 py-0.5 rounded bg-[#FF3B5C]/10 text-[#FF3B5C] border border-[#FF3B5C]/20">
                        {sig.rule_id || ("Rule " + (i+1))}
                      </span>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Details & AI Explain */}
        <div className="nu-card flex flex-col p-6 min-h-[500px]">
          {!selectedId ? (
            <div className="flex-1 flex flex-col items-center justify-center text-[#8A95B0]">
              <Eye size={48} className="mb-4 text-[#1E2535]" />
              <p>Select a case to view neural explanation and record investigation outcome.</p>
            </div>
          ) : (
            <div className="animate-in slide-in-from-right-4">
               <h2 className="font-mono-ibm text-lg font-semibold text-[#F0F4FF] mb-4">Investigator Assistant</h2>
               <div className="bg-[#0E1118]/80 p-4 border border-[#FF3B5C]/20 rounded-lg mb-6">
                 <h3 className="text-xs uppercase tracking-wider text-[#FFB300] font-mono-ibm mb-3 flex items-center gap-2">
                   <AlertTriangle size={14} /> AI Narrative Explanation
                 </h3>
                 {isLoadingExplain ? (
                   <div className="animate-pulse space-y-2">
                     <div className="h-3 w-full bg-[#1E2535] rounded"></div>
                     <div className="h-3 w-5/6 bg-[#1E2535] rounded"></div>
                     <div className="h-3 w-4/6 bg-[#1E2535] rounded"></div>
                   </div>
                 ) : (
                   <div className="text-sm text-[#8A95B0] leading-relaxed">
                     {explanation?.narrative || "The system flagged this policy based on historical correlates of fraudulent behavior, such as consecutive mismatched addresses and inconsistent claim history."}
                   </div>
                 )}
               </div>

               <div className="border-t border-[#1E2535] pt-6">
                 <h3 className="font-mono-ibm text-sm text-[#F0F4FF] mb-4">Resolution</h3>
                 <div className="flex gap-4">
                   <button className="nu-btn-primary flex-1 flex justify-center !bg-[#00D4FF]/10 !text-[#00D4FF] !border-[#00D4FF]/30 hover:!bg-[#00D4FF]/20">
                     <CheckCircle2 size={16} /> Mark as False Alarm
                   </button>
                   <button className="nu-btn-primary flex-1 flex justify-center !bg-[#FF3B5C]/20 !text-[#FF3B5C] !border-[#FF3B5C]/50 hover:!bg-[#FF3B5C]/30">
                     <XCircle size={16} /> Confirm Fraud
                   </button>
                 </div>
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
