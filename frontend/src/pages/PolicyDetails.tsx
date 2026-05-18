import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ChevronLeft,
  Sparkles,
  FileText,
  History as HistoryIcon,
  Loader2,
  MessageSquare,
  ArrowRight,
  Download,
} from 'lucide-react';
import { getPolicy } from '@/lib/api';
import { PolicyInlineChat } from '@/components/chat/PolicyInlineChat';
import { useChatStore } from '@/stores/useChatStore';
import { toast } from 'sonner';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/PageHeader';
import { IntelligencePanel } from '@/components/IntelligencePanel';
import { PolicyFieldGrid } from '@/components/PolicyFieldGrid';
import { AgentTrace } from '@/components/AgentTrace';
import { Button } from '@/components/ui/button';

export default function PolicyDetails() {
  const { id } = useParams<{ id: string }>();
  const [policy, setPolicy] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [prediction, setPrediction] = useState<any>(null);
  const { open: openChat } = useChatStore();

  useEffect(() => {
    if (id) fetchPolicy(id);
  }, [id]);

  const fetchPolicy = async (policyId: string) => {
    setLoading(true);
    try {
      const data = await getPolicy(policyId);
      setPolicy(data);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load policy details');
    } finally {
      setLoading(false);
    }
  };

  const handleAnalysisComplete = (result: any) => {
    setPolicy((prev: any) => ({ ...prev, ...result }));
    setPrediction(result);
    toast.success('Agent evaluation complete');
  };

  const handleAnalysisError = (err: any) => {
    toast.error(err.message || 'Assessment pipeline failed');
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin mb-4 text-brand-500" size={32} />
        <div className="text-sm font-mono-code text-text-tertiary">
          Retrieving policy metadata...
        </div>
      </div>
    );
  }

  if (!policy) {
    return (
      <div className="text-center py-20 text-text-tertiary">
        Policy file not found in registry.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 animate-fade-in pb-20">
       {/* Header */}
       <PageHeader
         title={policy.policy_number}
         subtitle={`${policy.policyholder_name} · ${policy.vehicle_make} ${policy.vehicle_model} · ${policy.vehicle_year}`}
         leading={
           <Link
             to="/policies"
             className="p-2 rounded-lg border border-surface-border hover:bg-surface-raised transition-all text-text-tertiary"
           >
             <ChevronLeft size={16} />
           </Link>
         }
         actions={
           <div className="flex gap-3">
             <Button
               variant="outline"
               onClick={() => openChat(id, 'policy')}
               className="gap-2 border-brand-500/20 text-brand-500 hover:bg-brand-500/5"
             >
               <Sparkles size={14} />
               Ask AI
             </Button>
             <Button variant="outline" className="gap-2 border-surface-border text-text-secondary">
               <Download size={14} />
               Export JSON
             </Button>
           </div>
         }
       />

      {/* Main layout: 2-column with sticky right panel */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8 items-start">
        
        {/* Left column: Data & Trace */}
        <div className="flex flex-col gap-8 min-w-0">
          
          {/* Top Tabs: Content Switching */}
          <Tabs defaultValue="details" className="w-full">
            <TabsList className="bg-transparent border-b border-surface-border p-0 gap-6 h-auto mb-6">
              {[
                { value: 'details', label: 'Asset Details', icon: FileText },
                { value: 'history', label: 'History', icon: HistoryIcon },
                { value: 'chat', label: 'Neural Chat', icon: MessageSquare },
              ].map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="bg-transparent border-b-2 border-transparent data-[state=active]:border-brand-500 data-[state=active]:text-brand-500 rounded-none pb-3 px-1 flex items-center gap-2 text-text-secondary hover:text-text-primary transition-all shadow-none"
                >
                  <tab.icon size={14} />
                  <span className="font-semibold text-xs uppercase tracking-wider">{tab.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="details" className="mt-0 focus-visible:outline-none">
              <Card className="p-8">
                <PolicyFieldGrid policy={policy} />
              </Card>
            </TabsContent>

            <TabsContent value="history" className="mt-0 focus-visible:outline-none">
              <Card className="p-8 text-center py-24 flex flex-col items-center">
                <HistoryIcon size={32} className="text-text-tertiary mb-4 opacity-30" />
                <h4 className="text-text-primary font-semibold mb-1">No Historical Versions</h4>
                <p className="text-sm text-text-tertiary max-w-xs mx-auto">
                  This policy has not been significantly modified since its initial creation in the core insurance engine.
                </p>
              </Card>
            </TabsContent>

            <TabsContent value="chat" className="mt-0 focus-visible:outline-none">
              <PolicyInlineChat policyId={id!} />
            </TabsContent>
          </Tabs>

          {/* Section: Agent Intelligence Trace */}
          <div>
            <div className="flex items-center justify-between mb-4 px-1">
               <div className="flex items-center gap-2">
                 <Sparkles size={16} className="text-ai" />
                 <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider">Agent Evaluation Trace</h3>
               </div>
               <div className="text-[10px] font-mono-code text-text-tertiary">
                 LLM: llama-3.3-70b @ GroqCloud
               </div>
            </div>
            
            <AgentTrace
              policyId={id!}
              onComplete={handleAnalysisComplete}
              onError={handleAnalysisError}
            />
          </div>
        </div>

        {/* Right column — Sticky Intelligence Panel */}
        <div className="lg:sticky lg:top-8 flex flex-col gap-6">
          <IntelligencePanel
            policy={policy}
            prediction={prediction}
            onComplete={handleAnalysisComplete}
            onError={handleAnalysisError}
          />
          
          <Card className="p-5 bg-brand-500/5 border-brand-500/10">
            <h4 className="text-xs font-bold text-brand-500 uppercase tracking-widest mb-3">Underwriter Toolkit</h4>
            <div className="flex flex-col gap-2">
               <Button className="w-full justify-between" variant="ghost" size="sm">
                 Generate Risk Report <ArrowRight size={14} />
               </Button>
               <Button className="w-full justify-between" variant="ghost" size="sm">
                 Request Additional Docs <ArrowRight size={14} />
               </Button>
               <Button className="w-full justify-between" variant="ghost" size="sm">
                 Manual Override <ArrowRight size={14} />
               </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}