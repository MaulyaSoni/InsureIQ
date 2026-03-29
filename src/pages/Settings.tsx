import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { setVishleshakConfig, getVishleshakConfig } from "@/lib/api";
import { toast } from "sonner";
import { Settings as SettingsIcon, Link, Zap } from "lucide-react";

export default function SettingsPage() {
  const config = getVishleshakConfig();
  const [baseUrl, setBaseUrl] = useState(config.base_url);
  const [apiKey, setApiKey] = useState(config.api_key || "");
  const [timeout, setTimeout] = useState(config.timeout_ms.toString());

  function handleSave() {
    setVishleshakConfig({
      base_url: baseUrl,
      api_key: apiKey || undefined,
      timeout_ms: Number(timeout),
    });
    toast.success("Vishleshak AI configuration saved");
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Configure InsureIQ and Vishleshak AI integration</p>
      </div>

      {/* Vishleshak AI Connection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Link className="h-4 w-4" />
            Vishleshak AI Connection
          </CardTitle>
          <CardDescription>
            Configure the connection to your Vishleshak AI backend. All agent endpoints (risk scoring, explainer, premium advisor, report writer) will use this base URL.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Base URL</Label>
            <Input
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://vishleshak-ai.streamlit.app/api"
            />
            <p className="text-xs text-muted-foreground">Endpoint base for all Vishleshak AI agent APIs</p>
          </div>
          <div className="space-y-1.5">
            <Label>API Key (optional)</Label>
            <Input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter API key if required"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Timeout (ms)</Label>
            <Input
              type="number"
              value={timeout}
              onChange={(e) => setTimeout(e.target.value)}
            />
          </div>
          <Button onClick={handleSave}>Save Configuration</Button>
        </CardContent>
      </Card>

      {/* API Endpoints Reference */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-4 w-4" />
            API Endpoints Reference
          </CardTitle>
          <CardDescription>These endpoints are called by InsureIQ to interact with Vishleshak AI agents</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            { method: "POST", path: "/risk-scoring", agent: "Risk Scoring Agent", desc: "XGBoost + SHAP risk analysis" },
            { method: "POST", path: "/claim-prediction", agent: "Claim Prediction", desc: "Claim probability & amount" },
            { method: "POST", path: "/premium-advisory", agent: "Premium Advisor Agent", desc: "Risk-adjusted premium" },
            { method: "POST", path: "/report", agent: "Report Writer Agent", desc: "Full underwriting report" },
            { method: "POST", path: "/batch", agent: "Batch Analysis", desc: "Portfolio-level batch processing" },
          ].map((ep) => (
            <div key={ep.path} className="flex items-center gap-3 p-3 rounded-lg bg-muted">
              <Badge variant="outline" className="font-mono text-xs">{ep.method}</Badge>
              <code className="text-xs font-mono flex-1">{ep.path}</code>
              <span className="text-xs text-muted-foreground">{ep.desc}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Database Config Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Database Configuration</CardTitle>
          <CardDescription>
            Connect to Supabase for persistent storage. Configure your Supabase project URL and anon key here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border-2 border-dashed border-border p-6 text-center">
            <p className="text-sm text-muted-foreground">Supabase integration placeholder</p>
            <p className="text-xs text-muted-foreground mt-1">Tables: policies, risk_assessments, claim_predictions, premium_advisories, reports, audit_log</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
