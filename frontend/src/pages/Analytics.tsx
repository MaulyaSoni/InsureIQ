import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Map, PieChart, BrainCircuit } from "lucide-react";
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
  ZoomableGroup
} from "react-simple-maps";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  CartesianGrid,
} from "recharts";
import { getGeoHeatmap, getSegmentBreakdown, getPortfolioInsights } from "@/lib/advancedApi";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, AICard } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

export default function Analytics() {
  const [segmentBy, setSegmentBy] = useState("vehicle_type");

  const { data: heatmapData, isLoading: isLoadingMap } = useQuery({
    queryKey: ["geoHeatmap"],
    queryFn: getGeoHeatmap,
  });

  const { data: segmentData, isLoading: isLoadingSegments } = useQuery({
    queryKey: ["segmentBreakdown", segmentBy],
    queryFn: () => getSegmentBreakdown(segmentBy),
  });

  const { data: insights, isLoading: isLoadingInsights } = useQuery({
    queryKey: ["portfolioInsights"],
    queryFn: getPortfolioInsights,
  });

  return (
    <div className="flex flex-col gap-6 animate-fade-in pb-20">
      <PageHeader
        title="Portfolio Intelligence"
        subtitle="Real-time macro analysis and geographical risk distribution"
      />

      {/* AI Insights Card */}
      <AICard hoverable={false} className="p-6">
        <div className="flex items-start gap-4">
          <div className="p-2 rounded-lg bg-ai/10">
            <BrainCircuit size={20} className="text-ai" />
          </div>
          <div className="flex-1 space-y-4">
            <h3 className="font-semibold text-xs text-ai uppercase tracking-wider">
              Neural Analyst Recommendation
            </h3>
            {isLoadingInsights ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-4/6" />
              </div>
            ) : (
              <div className="text-sm text-text-secondary space-y-3 leading-relaxed">
                {insights?.insights?.split("\n\n").map((para: string, i: number) => (
                  <p key={i}>{para}</p>
                )) || "No intelligence generated for the current portfolio state."}
              </div>
            )}
          </div>
        </div>
      </AICard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Heatmap */}
        <Card className="flex flex-col p-6 min-h-[500px]">
          <div className="flex items-center gap-2 mb-6">
            <Map className="text-brand-500" size={18} />
            <h2 className="font-semibold text-text-primary text-base">
              Geographical Risk Density
            </h2>
          </div>
          <div className="flex-1 relative bg-surface-raised rounded-lg border border-surface-border overflow-hidden">
            {isLoadingMap ? (
              <div className="flex items-center justify-center h-full">
                <Skeleton className="h-10 w-10 rounded-full animate-spin" />
              </div>
            ) : (
              <ComposableMap
                projection="geoMercator"
                projectionConfig={{
                  scale: 850,
                  center: [80, 22]
                }}
                style={{ width: "100%", height: "100%" }}
              >
                <ZoomableGroup zoom={1}>
                  <Geographies geography={geoUrl}>
                    {({ geographies }) =>
                      geographies.map((geo) => (
                        <Geography
                          key={geo.rsmKey}
                          geography={geo}
                          fill="#151A25"
                          stroke="#2A3441"
                          strokeWidth={0.5}
                          style={{
                            default: { outline: "none" },
                            hover: { fill: "#2A3441", outline: "none" },
                            pressed: { outline: "none" },
                          }}
                        />
                      ))
                    }
                  </Geographies>
                  {heatmapData?.map((city: any, i: number) => {
                    const critical = city.critical_count > 0;
                    const color = critical ? "var(--error)" : city.high_rate_pct > 20 ? "var(--warning)" : "var(--brand-500)";
                    const size = Math.max(4, Math.min(15, city.policy_count * 2));
                    return (
                      <Marker key={i} coordinates={[city.lng, city.lat]}>
                        <circle r={size} fill={color} fillOpacity={0.6} stroke={color} strokeWidth={2} />
                        <text
                          textAnchor="middle"
                          y={-size - 4}
                          style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "8px", fill: "var(--text-tertiary)" }}
                        >
                          {city.city} ({city.policy_count})
                        </text>
                      </Marker>
                    );
                  })}
                </ZoomableGroup>
              </ComposableMap>
            )}
          </div>
        </Card>

        {/* Segments */}
        <Card className="flex flex-col p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <PieChart className="text-brand-500" size={18} />
              <h2 className="font-semibold text-text-primary text-base">
                Segment Analysis
              </h2>
            </div>
            <select
              className="bg-surface-raised border border-surface-border rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-brand-500 w-[140px] text-text-primary"
              value={segmentBy}
              onChange={(e) => setSegmentBy(e.target.value)}
            >
              <option value="vehicle_type">Vehicle Type</option>
              <option value="city_tier">City Tier</option>
              <option value="vehicle_use">Usage Purpose</option>
              <option value="vehicle_year_range">Policy Age</option>
            </select>
          </div>

          <div className="flex-1 min-h-[350px]">
            {isLoadingSegments ? (
              <div className="flex items-center justify-center h-full">
                <Skeleton className="h-10 w-10 rounded-full animate-spin" />
              </div>
            ) : (
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={segmentData} margin={{ top: 20, right: 30, left: 0, bottom: 50 }}>
                 <CartesianGrid strokeDasharray="3 3" stroke="var(--surface-border)" vertical={false} />
                 <XAxis 
                   dataKey="segment_label" 
                   stroke="var(--text-tertiary)" 
                   fontSize={10} 
                   tickLine={false} 
                   axisLine={false} 
                   angle={-45} 
                   textAnchor="end" 
                 />
                 <YAxis 
                   stroke="var(--text-tertiary)" 
                   fontSize={10} 
                   tickLine={false} 
                   axisLine={false} 
                   tickFormatter={(val) => `${val}`}
                 />
                 <Tooltip 
                   cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }} 
                   contentStyle={{ backgroundColor: "var(--surface)", borderColor: "var(--surface-border)", fontSize: "12px", color: "var(--text-primary)" }}
                   itemStyle={{ color: "var(--brand-500)" }}
                 />
                 <Bar dataKey="avg_risk_score" name="Avg Risk Score" fill="var(--brand-500)" radius={[4, 4, 0, 0]} maxBarSize={40}>
                   {segmentData?.map((entry: any, index: number) => (
                     <Cell key={`cell-${index}`} fill={entry.avg_risk_score >= 80 ? 'var(--error)' : entry.avg_risk_score >= 50 ? 'var(--warning)' : 'var(--brand-500)'} />
                   ))}
                 </Bar>
               </BarChart>
             </ResponsiveContainer>
            )}
          </div>
          <div className="mt-4 flex gap-4 text-xs font-mono-code text-text-secondary">
            <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-brand-500"></div> Low Risk</div>
            <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-warning"></div> Med Risk</div>
            <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-error"></div> High Risk</div>
          </div>
        </Card>
      </div>
    </div>
  );
}
