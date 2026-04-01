import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDashboardStats } from "@/lib/api";
import type { DashboardStats } from "@/types/insurance";
import {
  ShieldAlert,
  FileText,
  TrendingUp,
  IndianRupee,
  AlertTriangle,
  BarChart3,
  Layers,
  CheckCircle,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, LineChart, Line, Legend,
} from "recharts";

const RISK_COLORS = ["hsl(160,60%,40%)", "hsl(35,90%,55%)", "hsl(0,72%,51%)", "hsl(0,85%,40%)"];

const riskTrendData = [
  { date: "Jan 1", avgScore: 38, low: 12, medium: 5, high: 2, critical: 1 },
  { date: "Jan 15", avgScore: 42, low: 10, medium: 7, high: 3, critical: 1 },
  { date: "Feb 1", avgScore: 40, low: 14, medium: 6, high: 2, critical: 2 },
  { date: "Feb 15", avgScore: 45, low: 11, medium: 8, high: 4, critical: 1 },
  { date: "Mar 1", avgScore: 43, low: 16, medium: 7, high: 3, critical: 2 },
  { date: "Mar 15", avgScore: 48, low: 13, medium: 9, high: 5, critical: 2 },
  { date: "Apr 1", avgScore: 44, low: 15, medium: 8, high: 3, critical: 1 },
  { date: "Apr 15", avgScore: 46, low: 14, medium: 10, high: 4, critical: 2 },
  { date: "May 1", avgScore: 50, low: 18, medium: 9, high: 5, critical: 3 },
  { date: "May 15", avgScore: 47, low: 16, medium: 11, high: 4, critical: 2 },
  { date: "Jun 1", avgScore: 52, low: 20, medium: 10, high: 6, critical: 3 },
  { date: "Jun 15", avgScore: 49, low: 18, medium: 12, high: 5, critical: 2 },
];

const premiumTrendData = [
  { month: "Jan", collected: 245000, recommended: 268000 },
  { month: "Feb", collected: 312000, recommended: 340000 },
  { month: "Mar", collected: 298000, recommended: 325000 },
  { month: "Apr", collected: 356000, recommended: 378000 },
  { month: "May", collected: 420000, recommended: 455000 },
  { month: "Jun", collected: 385000, recommended: 412000 },
];

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    getDashboardStats().then(setStats);
  }, []);

  if (!stats) return <div className="flex items-center justify-center h-96 text-muted-foreground">Loading...</div>;

  const statCards = [
    { label: "Total Policies", value: stats.total_policies, icon: FileText, color: "text-primary" },
    { label: "Avg Risk Score", value: `${stats.avg_risk_score}/100`, icon: ShieldAlert, color: "text-warning" },
    { label: "High Risk %", value: `${stats.high_risk_percentage}%`, icon: AlertTriangle, color: "text-destructive" },
    { label: "Total Assessed", value: stats.total_assessed, icon: CheckCircle, color: "text-success" },
    { label: "Claims Predicted", value: stats.claims_predicted, icon: TrendingUp, color: "text-info" },
    { label: "Reports Generated", value: stats.reports_generated, icon: BarChart3, color: "text-primary" },
    { label: "Total Insured", value: `₹${(stats.total_insured_value / 100000).toFixed(1)}L`, icon: Layers, color: "text-secondary" },
    { label: "Total Premium", value: `₹${(stats.total_premium / 1000).toFixed(0)}K`, icon: IndianRupee, color: "text-success" },
  ];

  const riskData = [
    { name: "Low", value: 2 },
    { name: "Medium", value: 2 },
    { name: "High", value: 1 },
    { name: "Critical", value: 1 },
  ];

  const monthlyData = [
    { month: "Jan", policies: 12, claims: 2 },
    { month: "Feb", policies: 18, claims: 3 },
    { month: "Mar", policies: 25, claims: 4 },
    { month: "Apr", policies: 20, claims: 2 },
    { month: "May", policies: 30, claims: 5 },
    { month: "Jun", policies: 22, claims: 3 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Vehicle Insurance Risk Analytics Overview</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card>
              <CardContent className="flex items-center gap-4 p-5">
                <div className={`rounded-lg bg-muted p-2.5 ${card.color}`}>
                  <card.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{card.label}</p>
                  <p className="text-xl font-bold">{card.value}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Risk Score Trend — Hero Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Risk Score Trend</CardTitle>
          <p className="text-xs text-muted-foreground">Average portfolio risk score over time with threshold bands</p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={riskTrendData}>
              <defs>
                <linearGradient id="riskGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(220,70%,55%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(220,70%,55%)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
              <XAxis dataKey="date" className="text-xs" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} className="text-xs" tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(220,25%,12%)",
                  border: "1px solid hsl(220,20%,20%)",
                  borderRadius: "8px",
                  color: "#fff",
                  fontSize: 12,
                }}
                labelStyle={{ color: "hsl(220,10%,70%)", fontWeight: 600 }}
              />
              {/* Threshold bands as reference areas */}
              <Area type="monotone" dataKey="avgScore" stroke="hsl(220,70%,55%)" strokeWidth={2.5} fill="url(#riskGrad)" dot={{ r: 3, fill: "hsl(220,70%,55%)", strokeWidth: 0 }} activeDot={{ r: 5, strokeWidth: 2, stroke: "#fff" }} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stacked Risk Band Area */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Risk Band Distribution Over Time</CardTitle>
            <p className="text-xs text-muted-foreground">Stacked view of policy count by risk band</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={riskTrendData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                <XAxis dataKey="date" className="text-xs" tick={{ fontSize: 11 }} />
                <YAxis className="text-xs" tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(220,25%,12%)",
                    border: "1px solid hsl(220,20%,20%)",
                    borderRadius: "8px",
                    color: "#fff",
                    fontSize: 12,
                  }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="low" stackId="1" stroke={RISK_COLORS[0]} fill={RISK_COLORS[0]} fillOpacity={0.6} />
                <Area type="monotone" dataKey="medium" stackId="1" stroke={RISK_COLORS[1]} fill={RISK_COLORS[1]} fillOpacity={0.6} />
                <Area type="monotone" dataKey="high" stackId="1" stroke={RISK_COLORS[2]} fill={RISK_COLORS[2]} fillOpacity={0.6} />
                <Area type="monotone" dataKey="critical" stackId="1" stroke={RISK_COLORS[3]} fill={RISK_COLORS[3]} fillOpacity={0.6} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Risk Distribution Donut */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Current Risk Split</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={riskData} cx="50%" cy="50%" innerRadius={55} outerRadius={95} dataKey="value" paddingAngle={3}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={{ strokeWidth: 1 }}>
                  {riskData.map((_, i) => (
                    <Cell key={i} fill={RISK_COLORS[i]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Policies & Claims */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Monthly Policies & Claims</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                <XAxis dataKey="month" className="text-xs" tick={{ fontSize: 11 }} />
                <YAxis className="text-xs" tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(220,25%,12%)",
                    border: "1px solid hsl(220,20%,20%)",
                    borderRadius: "8px",
                    color: "#fff",
                    fontSize: 12,
                  }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="policies" fill="hsl(220,70%,45%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="claims" fill="hsl(0,72%,51%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Premium Collected vs Recommended */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Premium: Collected vs Recommended</CardTitle>
            <p className="text-xs text-muted-foreground">Gap analysis between actual and AI-recommended premiums</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={premiumTrendData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                <XAxis dataKey="month" className="text-xs" tick={{ fontSize: 11 }} />
                <YAxis className="text-xs" tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(220,25%,12%)",
                    border: "1px solid hsl(220,20%,20%)",
                    borderRadius: "8px",
                    color: "#fff",
                    fontSize: 12,
                  }}
                  formatter={(value: number) => [`₹${value.toLocaleString("en-IN")}`, undefined]}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="collected" stroke="hsl(220,70%,55%)" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="recommended" stroke="hsl(160,50%,45%)" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
