import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Map, MapPin, BarChart3, PieChart, Activity, BrainCircuit } from "lucide-react";
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
  Legend
} from "recharts";
import { getGeoHeatmap, getSegmentBreakdown, getPortfolioInsights } from "@/lib/advancedApi";

// Note: Using a standard world topojson and zooming into India area as a fallback.
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
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="nu-page-title">Portfolio Intelligence</h1>
          <p className="nu-page-subtitle">Real-time macro analysis and geographical risk distribution</p>
        </div>
      </div>

      {/* AI Insights Card */}
      <div className="nu-card-ai p-6 border border-[#00D4FF]/30 bg-[#00D4FF]/5">
        <div className="flex items-start gap-4">
          <div className="mt-1 bg-[#00D4FF]/10 p-2 rounded-lg">
            <BrainCircuit size={20} className="text-[#00D4FF]" />
          </div>
          <div className="flex-1 space-y-4">
            <h3 className="font-mono-ibm text-[13px] text-[#00D4FF] uppercase tracking-wider font-semibold">
              Neural Analyst Recommendation
            </h3>
            {isLoadingInsights ? (
              <div className="space-y-2 animate-pulse">
                <div className="h-4 bg-[#1E2535] rounded w-full"></div>
                <div className="h-4 bg-[#1E2535] rounded w-5/6"></div>
                <div className="h-4 bg-[#1E2535] rounded w-4/6"></div>
              </div>
            ) : (
              <div className="text-sm text-[#8A95B0] space-y-3 leading-relaxed">
                {insights?.insights?.split("\n\n").map((para: string, i: number) => (
                  <p key={i}>{para}</p>
                )) || "No intelligence generated for the current portfolio state."}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Heatmap */}
        <div className="nu-card flex flex-col p-6 min-h-[500px]">
          <div className="flex items-center gap-2 mb-6">
            <Map className="text-[#00D4FF]" size={18} />
            <h2 className="font-mono-ibm text-[15px] font-semibold text-[#F0F4FF]">
              Geographical Risk Density
            </h2>
          </div>
          <div className="flex-1 relative bg-[#0E1118] rounded-lg border border-[#1E2535] overflow-hidden">
            {isLoadingMap ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00D4FF]"></div>
              </div>
            ) : (
              <ComposableMap
                projection="geoMercator"
                projectionConfig={{
                  scale: 850,
                  center: [80, 22] // Center on India
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
                          fill="#1E2535"
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
                    const color = critical ? "#FF3B5C" : city.high_rate_pct > 20 ? "#FFB300" : "#00D4FF";
                    const size = Math.max(4, Math.min(15, city.policy_count * 2));
                    return (
                      <Marker key={i} coordinates={[city.lng, city.lat]}>
                        <circle r={size} fill={color} fillOpacity={0.6} stroke={color} strokeWidth={2} />
                        <text
                          textAnchor="middle"
                          y={-size - 4}
                          style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: "8px", fill: "#8A95B0" }}
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
        </div>

        {/* Segments */}
        <div className="nu-card flex flex-col p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <PieChart className="text-[#00D4FF]" size={18} />
              <h2 className="font-mono-ibm text-[15px] font-semibold text-[#F0F4FF]">
                Segment Analysis
              </h2>
            </div>
            <select
              className="nu-select !py-1 !text-xs w-[140px]"
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
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00D4FF]"></div>
              </div>
            ) : (
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={segmentData} margin={{ top: 20, right: 30, left: 0, bottom: 50 }}>
                 <CartesianGrid strokeDasharray="3 3" stroke="#1E2535" vertical={false} />
                 <XAxis 
                   dataKey="segment_label" 
                   stroke="#8A95B0" 
                   fontSize={10} 
                   tickLine={false} 
                   axisLine={false} 
                   angle={-45} 
                   textAnchor="end" 
                 />
                 <YAxis 
                   stroke="#8A95B0" 
                   fontSize={10} 
                   tickLine={false} 
                   axisLine={false} 
                   tickFormatter={(val) => `${val}`}
                 />
                 <Tooltip 
                   cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }} 
                   contentStyle={{ backgroundColor: "#0E1118", borderColor: "#1E2535", fontSize: "12px", color: "#F0F4FF" }}
                   itemStyle={{ color: "#00D4FF" }}
                 />
                 <Bar dataKey="avg_risk_score" name="Avg Risk Score" fill="#00D4FF" radius={[4, 4, 0, 0]} maxBarSize={40}>
                   {segmentData?.map((entry: any, index: number) => (
                     <Cell key={`cell-${index}`} fill={entry.avg_risk_score >= 80 ? '#FF3B5C' : entry.avg_risk_score >= 50 ? '#FFB300' : '#00D4FF'} />
                   ))}
                 </Bar>
               </BarChart>
             </ResponsiveContainer>
            )}
          </div>
          <div className="mt-4 flex gap-4 text-xs font-mono-ibm text-[#8A95B0]">
            <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-[#00D4FF]"></div> Low Risk</div>
            <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-[#FFB300]"></div> Med Risk</div>
            <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-[#FF3B5C]"></div> High Risk</div>
          </div>
        </div>
      </div>
    </div>
  );
}
