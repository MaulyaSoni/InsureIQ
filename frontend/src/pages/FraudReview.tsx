import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ShieldAlert, AlertTriangle, Eye, CheckCircle2, XCircle } from "lucide-react";
import { getFraudReviews, getFraudExplain } from "@/lib/advancedApi";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, AICard } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

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
    <div className="flex flex-col gap-6 animate-fade-in pb-20">
      <PageHeader
        title="Fraud Investigation Review"
        subtitle="Policies flagged for suspicious patterns by the neural detection engine."
        actions={
          <div className="bg-error/10 border border-error/30 rounded-lg px-4 py-2 flex items-center gap-2">
            <ShieldAlert size={16} className="text-error" />
            <span className="font-mono-code text-sm text-error font-semibold">
              {fraudList?.length || 0} Open Cases
            </span>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* List */}
        <Card className="flex flex-col min-h-[500px] overflow-hidden p-0">
          <div className="p-4 border-b border-surface-border bg-surface-raised/30">
             <h2 className="text-xs font-semibold uppercase tracking-wider text-text-primary">Flagged Policies</h2>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-surface-border">
            {isLoading ? (
              <div className="p-8 flex flex-col gap-4">
                 <Skeleton className="h-16 w-full" />
                 <Skeleton className="h-16 w-full" />
                 <Skeleton className="h-16 w-full" />
              </div>
            ) : fraudList?.length === 0 ? (
              <div className="p-16 text-center text-text-secondary">No active fraud alerts detected.</div>
            ) : (
              fraudList?.map((item: any) => (
                <div 
                  key={item.policy_id} 
                  className={`p-4 cursor-pointer transition-colors ${selectedId === item.policy_id ? 'bg-error/5 border-l-2 border-l-error' : 'hover:bg-surface-raised border-l-2 border-l-transparent'}`}
                  onClick={() => setSelectedId(item.policy_id)}
                >
                  <div className="flex items-center justify-between mb-3">
                     <div>
                        <div className="font-semibold text-text-primary mb-1">{item.policy_number}</div>
                        <div className="text-xs text-text-secondary">{item.policyholder_name}</div>
                     </div>
                     <span className="text-xs font-mono-code text-text-tertiary">{new Date(item.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {item.fraud_signals?.map((sig: any, i: number) => (
                      <Badge key={i} variant="critical" size="sm">
                        {sig.rule_id || ("Rule " + (i+1))}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Details & AI Explain */}
        <Card className="flex flex-col p-6 min-h-[500px]">
          {!selectedId ? (
            <div className="flex-1 flex flex-col items-center justify-center text-text-tertiary">
              <Eye size={48} className="mb-4 opacity-50" />
              <p className="text-sm">Select a case to view neural explanation and record investigation outcome.</p>
            </div>
          ) : (
            <div className="animate-fade-in flex flex-col h-full">
               <h2 className="text-lg font-semibold text-text-primary mb-6">Investigator Assistant</h2>
               
               <AICard hoverable={false} className="p-5 mb-8">
                 <h3 className="text-xs uppercase tracking-wider text-warning font-semibold mb-4 flex items-center gap-2">
                   <AlertTriangle size={14} /> AI Narrative Explanation
                 </h3>
                 {isLoadingExplain ? (
                   <div className="space-y-3">
                     <Skeleton className="h-4 w-full" />
                     <Skeleton className="h-4 w-5/6" />
                     <Skeleton className="h-4 w-4/6" />
                   </div>
                 ) : (
                   <div className="text-sm text-text-secondary leading-relaxed">
                     {explanation?.narrative || "The system flagged this policy based on historical correlates of fraudulent behavior, such as consecutive mismatched addresses and inconsistent claim history."}
                   </div>
                 )}
               </AICard>

               <div className="mt-auto border-t border-surface-border pt-6">
                 <h3 className="text-xs font-semibold uppercase tracking-wider text-text-primary mb-4">Resolution</h3>
                 <div className="flex gap-4">
                   <Button variant="outline" className="flex-1 text-ai border-ai/30 hover:bg-ai/10">
                     <CheckCircle2 size={16} className="mr-2" /> Mark as False Alarm
                   </Button>
                   <Button variant="outline" className="flex-1 text-error border-error/30 hover:bg-error/10">
                     <XCircle size={16} className="mr-2" /> Confirm Fraud
                   </Button>
                 </div>
               </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
