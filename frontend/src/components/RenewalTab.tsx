import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AlertCircle, RefreshCw, FileText, ArrowRight } from "lucide-react";
import { getRenewalUpcoming, getRenewalAdvisory } from "@/lib/advancedApi";
import { Card, AICard } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

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
    <div className="flex flex-col gap-6 animate-fade-in">
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-2">
          <AlertCircle size={20} className="text-warning" />
          <h2 className="font-semibold text-text-primary text-base">
            Upcoming Renewals & Lapse Risk
          </h2>
        </div>
        <p className="text-sm text-text-secondary mb-8">
          Policies expiring in the next 60 days, scored for renewal risk and premium adjustment.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* Table */}
          <div className="border border-surface-border rounded-lg overflow-hidden bg-surface-raised/30">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-surface-raised/50 border-b border-surface-border">
                  <th className="px-4 py-3 font-medium text-text-tertiary uppercase tracking-wider text-xs">Policy No.</th>
                  <th className="px-4 py-3 font-medium text-text-tertiary uppercase tracking-wider text-xs">Expiry Date</th>
                  <th className="px-4 py-3 font-medium text-text-tertiary uppercase tracking-wider text-xs">Renewal Score</th>
                  <th className="px-4 py-3 font-medium text-text-tertiary uppercase tracking-wider text-xs">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border text-text-primary">
                {isLoading ? (
                  <tr>
                    <td colSpan={4} className="p-8">
                       <div className="flex flex-col gap-3 items-center justify-center">
                          <Skeleton className="h-6 w-full max-w-[300px]" />
                          <Skeleton className="h-6 w-full max-w-[280px]" />
                          <Skeleton className="h-6 w-full max-w-[320px]" />
                       </div>
                    </td>
                  </tr>
                ) : !Array.isArray(upcoming) || upcoming.length === 0 ? (
                  <tr><td colSpan={4} className="p-8 text-center text-text-tertiary">No policies expiring in 60 days.</td></tr>
                ) : (
                  upcoming.map((item: any) => (
                    <tr 
                      key={item.id}
                      className={`hover:bg-surface-raised cursor-pointer transition-colors ${selectedId === item.id ? 'bg-brand-500/5' : ''}`}
                      onClick={() => setSelectedId(item.id)}
                    >
                      <td className="px-4 py-3 font-mono-code text-brand-500 font-semibold">{item.policy_number}</td>
                      <td className="px-4 py-3 text-text-secondary">{new Date(item.expiry_date).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                           <div className="w-full bg-surface-border-strong h-1.5 rounded-full overflow-hidden max-w-[80px]">
                              <div className="h-full bg-brand-500" style={{ width: `${item.renewal_risk_score}%` }}></div>
                           </div>
                           <span className="text-[10px] font-mono-code text-text-tertiary">{item.renewal_risk_score}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Button variant="ghost" size="sm" className="h-8 px-2 text-brand-500 hover:text-brand-400">
                          Advisory <ArrowRight size={14} className="ml-1" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Advisory Panel */}
          <AICard hoverable={false} className="min-h-[350px] p-6 flex flex-col items-center justify-center">
            {!selectedId ? (
              <div className="flex flex-col items-center justify-center text-text-tertiary h-full gap-4 text-center">
                <FileText size={36} className="opacity-50" />
                <span className="text-sm">Select a policy to view neural advisory</span>
              </div>
            ) : isLoadingAdvisory ? (
              <div className="flex flex-col items-center justify-center h-full text-text-tertiary gap-4 text-center">
                <RefreshCw size={28} className="animate-spin text-ai" />
                <span className="text-sm">Generating advisory via Mixtral-8x7B...</span>
              </div>
            ) : (
              <div className="animate-fade-in flex flex-col h-full w-full">
                <div className="flex items-center gap-2 mb-6">
                  <BrainCircuit size={16} className="text-ai" />
                  <span className="font-semibold text-xs text-ai uppercase tracking-wider">Renewal Strategy Narrative</span>
                </div>
                <div className="flex-1 overflow-y-auto text-sm text-text-secondary leading-relaxed space-y-4 pr-2">
                   {advisory?.narrative?.split('\n\n').map((para: string, i: number) => (
                     <p key={i}>{para}</p>
                   )) || "System advisory generated but content is empty."}
                </div>
                <div className="mt-6 pt-4 border-t border-surface-border flex items-center justify-between">
                   <div className="text-xs text-text-tertiary">Recommended action logged to CRM auto-mailer.</div>
                   <Button size="sm">Execute Email</Button>
                </div>
              </div>
            )}
          </AICard>
        </div>
      </Card>
    </div>
  );
}

function BrainCircuit(props: any) {
  // SVG placeholder inside since lucide import might miss BrainCircuit due to version
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M12 4.5a2.5 2.5 0 0 0-4.96-.46 2.5 2.5 0 0 0-1.98 3 2.5 2.5 0 0 0-1.32 4.24 3 3 0 0 0 .34 5.58 2.5 2.5 0 0 0 2.96 3.08 2.5 2.5 0 0 0 4.91.05L12 20V4.5z"/><path d="M16 8V5c0-1.1.9-2 2-2"/><path d="M12 13h4"/><path d="M12 17h6"/><path d="M19 13v4"/><path d="M18 5h3"/></svg>
}
