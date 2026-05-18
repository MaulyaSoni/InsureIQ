import { useState } from "react";
import {
  Settings as SettingsIcon,
  ShieldCheck,
  Zap,
  Bot,
  Database,
  Lock,
  Globe,
  RefreshCw,
  Save,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function Settings() {
  const [activeTab, setActiveTab] = useState<"api" | "model" | "policy" | "security" | "team">("team");
  const [saving, setSaving] = useState(false);

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      toast.success("System configuration persistent");
    }, 1200);
  };

  const tabs = [
    { id: "api", name: "API & Data Streams", icon: Database },
    { id: "model", name: "Neural Agents", icon: Bot },
    { id: "policy", name: "Underwriting Rules", icon: SettingsIcon },
    { id: "security", name: "OAuth & Security", icon: Lock },
    { id: "team", name: "Workspace Members", icon: ShieldCheck },
  ];

  return (
    <div className="flex flex-col gap-6 animate-fade-in pb-12">
      <PageHeader
        title="Intelligence Console"
        subtitle="Configure system-wide neural parameters and API connectivity"
        actions={
          <Button 
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? <RefreshCw className="animate-spin mr-2" size={16} /> : <Save className="mr-2" size={16} />}
            {saving ? "Hashing..." : "Save Configuration"}
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-[250px_1fr] lg:grid-cols-[300px_1fr] gap-8 items-start">
        {/* Left Side: Category Navigator */}
        <div className="flex flex-col gap-2">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-left text-sm transition-all duration-200 ${
                activeTab === t.id 
                  ? "bg-brand-500/10 text-brand-500 font-semibold border border-brand-500/20" 
                  : "text-text-secondary hover:bg-surface-raised hover:text-text-primary border border-transparent font-medium"
              }`}
            >
              <t.icon size={18} />
              {t.name}
            </button>
          ))}

          <div className="p-5 mt-4">
            <div className="font-mono-code text-xs text-text-tertiary border-t border-surface-border pt-4 leading-relaxed">
              System v2.4.1 (Stable)<br />
              Environment: Production-Mumbai<br />
              IRDAI Compliance: ACTIVE
            </div>
          </div>
        </div>

        {/* Right Side: Configuration Blocks */}
        <Card className="p-8">
          {activeTab === "team" && (
            <div className="flex flex-col gap-8">
              <div>
                <h3 className="font-semibold text-lg text-text-primary mb-2">Team Management</h3>
                <p className="text-sm text-text-secondary mb-6">Manage organization members and role-based access control.</p>
                <div className="flex flex-col sm:flex-row items-end gap-3 mb-8">
                  <div className="flex-1 w-full">
                    <label className="text-xs uppercase tracking-wider text-text-tertiary font-semibold mb-2 block">Email Address</label>
                    <input type="email" className="w-full bg-surface-raised border border-surface-border text-sm text-text-primary rounded-lg px-3 py-2.5 focus:outline-none focus:border-brand-500" placeholder="colleague@suresafe.in" />
                  </div>
                  <div className="w-full sm:w-[140px]">
                    <label className="text-xs uppercase tracking-wider text-text-tertiary font-semibold mb-2 block">Role</label>
                    <select className="w-full bg-surface-raised border border-surface-border text-sm text-text-primary rounded-lg px-3 py-2.5 focus:outline-none focus:border-brand-500">
                      <option value="VIEWER">VIEWER</option>
                      <option value="ANALYST">ANALYST</option>
                      <option value="MANAGER">MANAGER</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>
                  </div>
                  <Button onClick={() => toast.success("Invitation sent with temporary credentials.")} className="w-full sm:w-auto mt-4 sm:mt-0">Invite User</Button>
                </div>
                
                <div className="border border-surface-border rounded-lg overflow-hidden">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-surface-border bg-surface-raised/50">
                        <th className="px-4 py-3 font-medium text-text-tertiary uppercase tracking-wider text-xs">User</th>
                        <th className="px-4 py-3 font-medium text-text-tertiary uppercase tracking-wider text-xs">Role</th>
                        <th className="px-4 py-3 font-medium text-text-tertiary uppercase tracking-wider text-xs">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-border text-text-primary">
                      <tr className="hover:bg-surface-raised transition-colors">
                        <td className="px-4 py-3">
                           <div className="font-medium text-sm">admin@suresafe.in</div>
                           <div className="text-xs text-text-tertiary">Admin User</div>
                        </td>
                        <td className="px-4 py-3">
                           <Badge variant="low" size="sm">ADMIN</Badge>
                        </td>
                        <td className="px-4 py-3 text-success text-xs font-semibold">Active</td>
                      </tr>
                      <tr className="hover:bg-surface-raised transition-colors">
                        <td className="px-4 py-3">
                           <div className="font-medium text-sm">analyst@suresafe.in</div>
                           <div className="text-xs text-text-tertiary">Senior Analyst</div>
                        </td>
                        <td className="px-4 py-3">
                           <Badge variant="default" size="sm">ANALYST</Badge>
                        </td>
                        <td className="px-4 py-3 text-success text-xs font-semibold">Active</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === "api" && (
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-xs uppercase tracking-wider text-text-tertiary font-semibold">Main Backend Core Endpoint</label>
                <div className="relative">
                  <Globe size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
                  <input type="text" className="w-full bg-surface-raised border border-surface-border rounded-lg pl-10 pr-3 py-2 text-sm text-text-primary focus:outline-none focus:border-brand-500" defaultValue="https://api.insureiq.internal/v2" />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs uppercase tracking-wider text-text-tertiary font-semibold">External Risk Oracle (XOR)</label>
                <input type="text" className="w-full bg-surface-raised border border-surface-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-brand-500" defaultValue="https://xor.internal.mumbai.gov.in" />
                <span className="text-xs text-text-tertiary font-mono-code">Last synced 2.4 min ago · Latency: 14ms</span>
              </div>
              <div className="h-px w-full bg-surface-border my-2" />
              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-1">
                  <div className="font-semibold text-text-primary text-sm">Auto-Stream Evaluation</div>
                  <div className="text-xs text-text-secondary">Trigger assessment pipeline automatically upon ingest.</div>
                </div>
                <div className="w-11 h-6 rounded-full bg-brand-500 relative cursor-pointer">
                  <div className="w-4 h-4 rounded-full bg-white absolute top-1 right-1" />
                </div>
              </div>
            </div>
          )}

          {activeTab === "model" && (
            <div className="flex flex-col gap-8">
              <div className="flex flex-col gap-4">
                <label className="text-xs uppercase tracking-wider text-text-tertiary font-semibold">Active Underwriting Model Node</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { id: "llama-3.1-8b", name: "llama-3.1-8b", tag: "Fast / Efficient", color: "bg-text-tertiary" },
                    { id: "llama-3.3-70b", name: "llama-3.3-70b", tag: "Most Intelligent", color: "bg-ai", active: true },
                    { id: "gpt-4o", name: "GPT-4o", tag: "External Enterprise", color: "bg-purple-500" },
                    { id: "ensemble", name: "Ensemble-V3", tag: "Multi-Model Voting", color: "bg-success" },
                  ].map(m => (
                    <div 
                      key={m.id} 
                      className={`p-4 border rounded-lg cursor-pointer transition-all flex items-center gap-3 ${
                        m.active ? "border-ai bg-ai/5" : "border-surface-border bg-surface-raised"
                      }`}
                    >
                      <div className={`w-2 h-2 rounded-full ${m.color}`} />
                      <div className="flex-1">
                        <div className="font-mono-code text-sm text-text-primary font-semibold">{m.name}</div>
                        <div className="text-xs text-text-secondary">{m.tag}</div>
                      </div>
                      {m.active && <Zap size={16} className="text-ai" />}
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-4">
                <label className="text-xs uppercase tracking-wider text-text-tertiary font-semibold">Reasoning Chain-of-Thought Temperature</label>
                <input type="range" className="w-full accent-ai" min="1" max="100" defaultValue="42" />
                <div className="flex justify-between text-xs text-text-tertiary font-mono-code">
                  <span>Precise (0.1)</span>
                  <span>Neural Standard (0.42)</span>
                  <span>Creative (0.9+)</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === "policy" && (
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-4">
                <label className="text-xs uppercase tracking-wider text-text-tertiary font-semibold">Critical Severity Threshold</label>
                <div className="font-mono-code text-lg text-error font-bold block mb-2">85.0 +</div>
                <input type="range" className="w-full accent-error" min="50" max="95" defaultValue="85" />
              </div>
              <div className="flex items-center gap-3 p-4 bg-warning/10 border border-warning/30 rounded-lg">
                <AlertTriangle size={18} className="text-warning shrink-0" />
                <span className="text-sm text-text-primary leading-snug">Modifying these thresholds will re-classify all active policies in the next nightly batch run.</span>
              </div>
              <div className="h-px w-full bg-surface-border my-2" />
              <div className="flex flex-col gap-4">
                <label className="text-xs uppercase tracking-wider text-text-tertiary font-semibold">Mandatory Report Sections</label>
                <div className="flex flex-col gap-3">
                  {[
                    { id: "risk", label: "SHAP Factor Attribution", active: true },
                    { id: "prem", label: "Multi-insurer Benchmarks", active: true },
                    { id: "auth", label: "Sign-off Metadata Block", active: false },
                  ].map(s => (
                    <div key={s.id} className="flex items-center gap-3">
                      <input type="checkbox" id={s.id} defaultChecked={s.active} className="w-4 h-4 rounded bg-surface-raised border-surface-border text-brand-500 focus:ring-brand-500" />
                      <label htmlFor={s.id} className="text-sm text-text-primary cursor-pointer">{s.label}</label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "security" && (
            <div className="flex flex-col gap-8">
              <div className="flex flex-col gap-2">
                <label className="text-xs uppercase tracking-wider text-text-tertiary font-semibold">Session Rotation Frequency</label>
                <select className="w-full bg-surface-raised border border-surface-border text-sm text-text-primary rounded-lg px-3 py-2.5 outline-none focus:border-brand-500">
                  <option>Every 24 Hours</option>
                  <option>Every 12 Hours</option>
                  <option>IRDAI Compliant (Real-time)</option>
                </select>
              </div>
              <div className="h-px w-full bg-surface-border" />
              <Button variant="outline" className="w-fit border-error text-error hover:bg-error/10">
                <Trash2 size={16} className="mr-2" /> Clear System Audit Hashing
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
