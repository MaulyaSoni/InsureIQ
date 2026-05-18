import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, XCircle, AlertTriangle, UserCheck, Bot, Clock, ArrowRight } from "lucide-react";
import { getWorkbenchQueue, getWorkbenchStats, submitUnderwritingDecision, getAiRecommendation } from "@/lib/advancedApi";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, AICard } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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
    <div className="flex flex-col gap-6 animate-fade-in pb-20">
      <PageHeader
        title="Underwriter Workbench"
        subtitle="Manual review queue for HIGH and CRITICAL risk bands"
        actions={
          <div className="flex flex-wrap gap-4">
            <Card className="px-4 py-2 flex items-center gap-2 bg-ai/5 border-ai/20 p-2">
              <Bot size={16} className="text-ai" />
              <span className="font-mono-code text-xs text-text-tertiary uppercase">AI Agreement Rate:</span>
              <span className="font-mono-code text-sm text-ai font-semibold">
                {stats?.ai_agreement_rate_pct ? `${stats.ai_agreement_rate_pct}%` : "N/A"}
              </span>
            </Card>
            <Card className="px-4 py-2 flex items-center gap-2 p-2">
              <AlertTriangle size={16} className="text-warning" />
              <span className="font-mono-code text-xs text-text-tertiary uppercase">Pending:</span>
              <span className="font-mono-code text-sm text-text-primary font-semibold">{stats?.pending_count || 0}</span>
            </Card>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Queue List */}
        <Card className="flex flex-col p-0 md:col-span-1 overflow-hidden h-fit md:max-h-[calc(100vh-200px)]">
          <div className="p-4 border-b border-surface-border flex items-center gap-2 bg-surface-raised/50">
            <Clock size={16} className="text-text-tertiary" />
            <h2 className="font-semibold text-text-primary text-sm">Review Queue</h2>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {isLoadingQueue ? (
              <div className="p-8 text-center text-text-tertiary text-sm">Loading queue...</div>
            ) : queueItems.length === 0 ? (
              <div className="p-8 text-center text-text-tertiary text-sm flex flex-col items-center gap-3">
                <CheckCircle2 size={32} className="text-success opacity-50" />
                <span>Inbox Zero. All queues cleared.</span>
              </div>
            ) : (
              queueItems.map((task: any) => (
                <div 
                  key={task.id || task.queue_id}
                  onClick={() => setSelectedTask(task)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    (selectedTask?.id || selectedTask?.queue_id) === (task.id || task.queue_id) 
                      ? "bg-brand-500/10 border-brand-500 shadow-[0_0_10px_rgba(83,74,183,0.1)]" 
                      : "bg-surface-raised border-surface-border hover:border-surface-border-strong"
                  }`}
                >
                  <div className="flex justify-between items-start mb-2 gap-2">
                    <span className="font-mono-code text-sm font-semibold text-text-primary">{task.policy_number}</span>
                    <Badge variant={(task.priority === "URGENT" || String(task.risk_band || "").toUpperCase() === "CRITICAL") ? "critical" : "warning"} size="sm">
                       {task.risk_band || "N/A"}
                    </Badge>
                  </div>
                  <div className="text-xs text-text-secondary mb-3">Score: <span className="font-mono-code text-text-primary">{task.risk_score}</span> | {task.seating_capacity} seats</div>
                  <div className="flex items-center justify-between text-[10px] text-text-tertiary font-mono-code">
                    <span>Pending ({new Date(task.created_at).toLocaleDateString()})</span>
                    <ArrowRight size={12} />
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Review Panel */}
        <div className="md:col-span-2">
          {selectedTask ? (
            <Card className="h-full flex flex-col p-6 animate-fade-in">
              <div className="flex flex-col sm:flex-row justify-between items-start mb-6 pb-6 border-b border-surface-border gap-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-2xl font-semibold text-text-primary font-mono-code">{selectedTask.policy_number}</h2>
                    <Link to={`/policies/${selectedTask.policy_id}`} target="_blank" className="text-xs text-brand-500 hover:text-brand-400 font-medium flex items-center gap-1 transition-colors">
                      View Full File <ArrowRight size={14} />
                    </Link>
                  </div>
                  <div className="text-sm text-text-secondary">{selectedTask.policyholder_name} | {selectedTask.vehicle_make} {selectedTask.vehicle_model}</div>
                </div>
                <div className="text-left sm:text-right">
                  <div className="text-xs text-text-tertiary uppercase tracking-wider font-semibold mb-1">Neural Risk Score</div>
                  <div className={`text-4xl font-mono-code font-bold ${selectedTask.risk_score > 80 ? 'text-error' : 'text-warning'}`}>
                    {selectedTask.risk_score}
                  </div>
                </div>
              </div>

              {/* AI Recommendation Box */}
              <AICard hoverable={false} className="p-6 mb-8 flex flex-col gap-3 min-h-[140px]">
                <div className="flex items-center gap-2 mb-2">
                  <Bot size={18} className="text-ai" />
                  <h3 className="text-xs text-ai font-semibold uppercase tracking-wider">AI SYSTEM RECOMMENDATION</h3>
                </div>
                {isLoadingAi ? (
                  <div className="text-sm text-text-tertiary animate-pulse mt-2">Running neural risk assessment models...</div>
                ) : (
                  <>
                    <div className="text-xl text-text-primary font-semibold">
                      Recommended Action: <span className="text-ai">{aiRec?.recommendation || "LOAD PREMIUM"}</span>
                    </div>
                    <p className="text-sm text-text-secondary leading-relaxed mt-2">
                      {aiRec?.reason || "Higher than average risk profile detected based on vehicle age and territorial factors. Recommending a minimum 15% loading factor to offset projected claim probability."}
                    </p>
                  </>
                )}
              </AICard>

              <div className="flex-1 flex flex-col gap-6">
                <div className="flex flex-col gap-2">
                  <label className="text-xs uppercase tracking-wider font-semibold text-text-tertiary">Underwriter Notes (Internal)</label>
                  <textarea 
                    className="w-full bg-surface-raised border border-surface-border text-sm text-text-primary rounded-lg px-3 py-3 focus:outline-none focus:border-brand-500 min-h-[120px] resize-none" 
                    placeholder="Enter justification for final decision..."
                    value={decisionNotes}
                    onChange={(e) => setDecisionNotes(e.target.value)}
                  />
                </div>
                
                <div className="flex flex-col gap-2">
                  <label className="text-xs uppercase tracking-wider font-semibold text-text-tertiary">Optional Premium Loading (%)</label>
                  <input 
                    type="number" 
                    className="w-full sm:w-48 bg-surface-raised border border-surface-border text-sm text-text-primary rounded-lg px-3 py-2.5 focus:outline-none focus:border-brand-500" 
                    placeholder="e.g. 15"
                    value={premiumLoad}
                    onChange={(e) => setPremiumLoad(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 mt-8 pt-6 border-t border-surface-border mt-auto">
                <Button 
                  className="flex-1 bg-success hover:bg-success/90 text-success-foreground"
                  onClick={() => handleDecision("APPROVE")}
                  disabled={submitMutation.isPending}
                >
                  <CheckCircle2 size={16} className="mr-2" /> Approve Policy
                </Button>
                <Button 
                  className="flex-1 bg-warning hover:bg-warning/90 text-warning-foreground"
                  onClick={() => handleDecision("LOAD_PREMIUM")}
                  disabled={submitMutation.isPending}
                >
                  <AlertTriangle size={16} className="mr-2" /> Load Premium
                </Button>
                <Button 
                  className="flex-1 bg-error hover:bg-error/90 text-error-foreground"
                  onClick={() => handleDecision("DECLINE")}
                  disabled={submitMutation.isPending}
                >
                  <XCircle size={16} className="mr-2" /> Decline
                </Button>
              </div>
            </Card>
          ) : (
            <Card className="h-full flex flex-col items-center justify-center p-12 text-text-tertiary border-dashed border-2 bg-surface-raised/20">
              <UserCheck size={48} className="mb-6 opacity-50" />
              <h3 className="text-xl font-medium text-text-primary mb-3">No Task Selected</h3>
              <p className="text-sm text-center max-w-sm text-text-secondary leading-relaxed">
                Select a review task from the queue to evaluate risk factors and record an underwriting decision.
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
