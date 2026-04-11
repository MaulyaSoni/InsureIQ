import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, XCircle, AlertTriangle, UserCheck, Bot, Clock, ArrowRight } from "lucide-react";
import { getWorkbenchQueue, getWorkbenchStats, submitUnderwritingDecision, getAiRecommendation } from "@/lib/advancedApi";
import { toast } from "sonner";
import { Link } from "react-router-dom";

export default function Workbench() {
  const queryClient = useQueryClient();
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [aiRec, setAiRec] = useState<any>(null);
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [decisionNotes, setDecisionNotes] = useState("");
  const [premiumLoad, setPremiumLoad] = useState("");

  const { data: queue, isLoading: isLoadingQueue } = useQuery({
    queryKey: ["workbenchQueue"],
    queryFn: getWorkbenchQueue,
  });

  const { data: stats } = useQuery({
    queryKey: ["workbenchStats"],
    queryFn: getWorkbenchStats,
  });

  const queueItems = Array.isArray(queue)
    ? queue
    : Array.isArray(queue?.items)
      ? queue.items
      : [];

  useEffect(() => {
    if (selectedTask?.policy_id) {
      setAiRec(null);
      setIsLoadingAi(true);
      getAiRecommendation(selectedTask.policy_id)
        .then((res) => {
          setAiRec(res);
        })
        .catch((e) => {
          console.error(e);
          toast.error("Failed to fetch AI recommendation");
        })
        .finally(() => {
          setIsLoadingAi(false);
        });
    }
  }, [selectedTask?.policy_id]);

  const submitMutation = useMutation({
    mutationFn: (data: any) => submitUnderwritingDecision(selectedTask?.policy_id, data),
    onSuccess: () => {
      toast.success("Underwriting decision recorded");
      queryClient.invalidateQueries({ queryKey: ["workbenchQueue"] });
      queryClient.invalidateQueries({ queryKey: ["workbenchStats"] });
      setSelectedTask(null);
      setDecisionNotes("");
      setPremiumLoad("");
    },
    onError: () => {
      toast.error("Failed to submit decision");
    }
  });

  const handleDecision = (decision: string) => {
    if (!selectedTask) return;
    
    // Check if the user agreed with AI recommendation
    const isAgreeing = (decision.toUpperCase() === aiRec?.recommendation?.toUpperCase());
    
    submitMutation.mutate({
      decision,
      notes: decisionNotes,
      premium_loading_pct: premiumLoad ? parseFloat(premiumLoad) : null,
      followed_ai: isAgreeing,
      decline_reason: decision === "DECLINE" ? (decisionNotes || "High risk") : null
    });
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="nu-page-title">Underwriter Workbench</h1>
          <p className="nu-page-subtitle">Manual review queue for HIGH and CRITICAL risk bands</p>
        </div>
        <div className="flex gap-4">
          <div className="nu-card px-4 py-2 flex items-center gap-2 border border-[#00D4FF]/20">
            <Bot size={14} className="text-[#00D4FF]" />
            <span className="font-mono-ibm text-xs text-[#8A95B0]">AI Agreement Rate:</span>
            <span className="font-mono-ibm text-sm text-[#00D4FF] font-semibold">
              {stats?.ai_agreement_rate_pct ? `${stats.ai_agreement_rate_pct}%` : "N/A"}
            </span>
          </div>
          <div className="nu-card px-4 py-2 flex items-center gap-2">
            <AlertTriangle size={14} className="text-[#FFB300]" />
            <span className="font-mono-ibm text-xs text-[#8A95B0]">Pending:</span>
            <span className="font-mono-ibm text-sm text-[#F0F4FF] font-semibold">{stats?.pending_count || 0}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Queue List */}
        <div className="nu-card flex flex-col p-0 lg:col-span-1 overflow-hidden h-[calc(100vh-200px)]">
          <div className="p-4 border-b border-[#1E2535] flex items-center gap-2 bg-[#0E1118]">
            <Clock size={16} className="text-[#8A95B0]" />
            <h2 className="font-mono-ibm text-sm font-semibold text-[#F0F4FF]">Review Queue</h2>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {isLoadingQueue ? (
              <div className="p-4 text-center text-[#8A95B0] text-sm">Loading queue...</div>
            ) : queueItems.length === 0 ? (
              <div className="p-4 text-center text-[#8A95B0] text-sm flex flex-col items-center gap-2">
                <CheckCircle2 size={32} className="text-[#00E676] opacity-50" />
                <span>Inbox Zero. All queues cleared.</span>
              </div>
            ) : (
              queueItems.map((task: any) => (
                <div 
                  key={task.id || task.queue_id}
                  onClick={() => setSelectedTask(task)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    (selectedTask?.id || selectedTask?.queue_id) === (task.id || task.queue_id) 
                      ? "bg-[#00D4FF]/10 border-[#00D4FF] shadow-[0_0_10px_rgba(0,212,255,0.1)]" 
                      : "bg-[#0B0D14] border-[#1E2535] hover:border-[#2A3441]"
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-mono-ibm text-xs font-semibold text-[#F0F4FF]">{task.policy_number}</span>
                    <span className={`text-[10px] uppercase font-mono-ibm px-2 py-0.5 rounded ${
                      task.priority === "URGENT" || String(task.risk_band || "").toUpperCase() === "CRITICAL" ? "bg-[#FF3B5C]/20 text-[#FF3B5C]" : "bg-[#FFB300]/20 text-[#FFB300]"
                    }`}>
                      {task.risk_band || "N/A"}
                    </span>
                  </div>
                  <div className="text-xs text-[#8A95B0] mb-2">Score: {task.risk_score} | {task.seating_capacity} seats</div>
                  <div className="flex items-center justify-between text-[10px] text-[#485068]">
                    <span>Pending ({new Date(task.created_at).toLocaleDateString()})</span>
                    <ArrowRight size={12} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Review Panel */}
        <div className="lg:col-span-2">
          {selectedTask ? (
            <div className="nu-card h-full flex flex-col p-6 animate-in slide-in-from-right-4 duration-300">
              <div className="flex justify-between items-start mb-6 pb-6 border-b border-[#1E2535]">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-2xl font-semibold text-[#F0F4FF]">{selectedTask.policy_number}</h2>
                    <Link to={`/policies/${selectedTask.policy_id}`} target="_blank" className="text-xs text-[#00D4FF] hover:underline flex items-center gap-1">
                      View Full File <ArrowRight size={12} />
                    </Link>
                  </div>
                  <div className="text-sm text-[#8A95B0]">{selectedTask.policyholder_name} | {selectedTask.vehicle_make} {selectedTask.vehicle_model}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-[#8A95B0] font-mono-ibm mb-1">Neural Risk Score</div>
                  <div className={`text-2xl font-mono-ibm font-bold ${selectedTask.risk_score > 80 ? 'text-[#FF3B5C]' : 'text-[#FFB300]'}`}>
                    {selectedTask.risk_score}
                  </div>
                </div>
              </div>

              {/* AI Recommendation Box */}
              <div className="bg-[#0e2936]/40 border border-[#00D4FF]/30 rounded-lg p-5 mb-8 min-h-[140px]">
                <div className="flex items-center gap-2 mb-3">
                  <Bot size={18} className="text-[#00D4FF]" />
                  <h3 className="font-mono-ibm text-xs text-[#00D4FF] font-semibold tracking-wider">AI SYSTEM RECOMMENDATION</h3>
                </div>
                {isLoadingAi ? (
                  <div className="text-sm text-[#8A95B0] animate-pulse">Running neural risk assessment models...</div>
                ) : (
                  <>
                    <div className="text-xl text-[#F0F4FF] font-semibold mb-2">
                      Recommended Action: <span className="text-[#00D4FF]">{aiRec?.recommendation || "LOAD PREMIUM"}</span>
                    </div>
                    <p className="text-sm text-[#8A95B0] leading-relaxed">
                      {aiRec?.reason || "Higher than average risk profile detected based on vehicle age and territorial factors. Recommending a minimum 15% loading factor to offset projected claim probability."}
                    </p>
                  </>
                )}
              </div>

              <div className="flex-1 flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <label className="nu-label">Underwriter Notes (Internal)</label>
                  <textarea 
                    className="nu-input min-h-[100px] resize-none" 
                    placeholder="Enter justification for final decision..."
                    value={decisionNotes}
                    onChange={(e) => setDecisionNotes(e.target.value)}
                  />
                </div>
                
                <div className="flex flex-col gap-2">
                  <label className="nu-label">Optional Premium Loading (%)</label>
                  <input 
                    type="number" 
                    className="nu-input w-48" 
                    placeholder="e.g. 15"
                    value={premiumLoad}
                    onChange={(e) => setPremiumLoad(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex gap-4 mt-8 pt-6 border-t border-[#1E2535]">
                <button 
                  className="nu-btn-primary flex-1 flex justify-center !bg-[#00E676]/20 !text-[#00E676] !border-[#00E676]/50 hover:!bg-[#00E676]/30"
                  onClick={() => handleDecision("APPROVE")}
                  disabled={submitMutation.isPending}
                >
                  <CheckCircle2 size={16} /> Approve Policy
                </button>
                <button 
                  className="nu-btn-primary flex-1 flex justify-center !bg-[#FFB300]/20 !text-[#FFB300] !border-[#FFB300]/50 hover:!bg-[#FFB300]/30"
                  onClick={() => handleDecision("LOAD_PREMIUM")}
                  disabled={submitMutation.isPending}
                >
                  <AlertTriangle size={16} /> Load Premium
                </button>
                <button 
                  className="nu-btn-primary flex-1 flex justify-center !bg-[#FF3B5C]/20 !text-[#FF3B5C] !border-[#FF3B5C]/50 hover:!bg-[#FF3B5C]/30"
                  onClick={() => handleDecision("DECLINE")}
                  disabled={submitMutation.isPending}
                >
                  <XCircle size={16} /> Decline
                </button>
              </div>
            </div>
          ) : (
            <div className="nu-card h-full flex flex-col items-center justify-center p-6 text-[#8A95B0]">
              <UserCheck size={48} className="mb-4 text-[#1E2535]" />
              <h3 className="text-lg text-[#F0F4FF] mb-2">No Task Selected</h3>
              <p className="text-sm text-center max-w-sm">
                Select a review task from the queue to evaluate risk factors and record an underwriting decision.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
