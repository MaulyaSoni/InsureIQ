import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { Zap, Loader2, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function Signup() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("underwriter");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await signup(email, password, name);
      toast.success("Account created! Welcome to InsureIQ.");
      navigate("/");
    } catch (err: any) {
      toast.error(err.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  }

  const roles = [
    { value: "underwriter", label: "Underwriter" },
    { value: "risk_analyst", label: "Risk Analyst" },
    { value: "actuary", label: "Actuary" },
    { value: "manager", label: "Manager" },
  ];

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6 relative overflow-hidden">
      {/* Grid bg */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(83,74,183,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(83,74,183,0.03)_1px,transparent_1px)] bg-[size:48px_48px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[radial-gradient(circle,rgba(83,74,183,0.07)_0%,transparent_70%)] pointer-events-none" />

      <div className="w-full max-w-[480px] relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-brand-500/10 border border-brand-500/20 mb-4">
            <Zap size={28} className="text-brand-500" />
          </div>
          <div className="font-mono-code text-3xl font-bold text-text-primary tracking-tight">
            InsureIQ
          </div>
          <div className="text-sm text-text-secondary mt-2">
            Create Your Enterprise Account
          </div>
        </div>

        {/* Card */}
        <Card className="p-8 shadow-2xl shadow-black/40 border-surface-border-strong">
          <div className="font-mono-code text-base font-semibold text-text-primary mb-6">
            Request Access
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            {/* Name */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-text-tertiary" htmlFor="name">Full Name</label>
              <input
                id="name"
                type="text"
                className="w-full bg-surface-raised border border-surface-border text-sm text-text-primary rounded-lg px-4 py-3 focus:outline-none focus:border-brand-500 transition-colors"
                placeholder="John Smith"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            {/* Email */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-text-tertiary" htmlFor="email">Work Email</label>
              <input
                id="email"
                type="email"
                className="w-full bg-surface-raised border border-surface-border text-sm text-text-primary rounded-lg px-4 py-3 focus:outline-none focus:border-brand-500 transition-colors"
                placeholder="john@icici-lombard.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {/* Company */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-text-tertiary" htmlFor="company">Organization</label>
              <input
                id="company"
                type="text"
                className="w-full bg-surface-raised border border-surface-border text-sm text-text-primary rounded-lg px-4 py-3 focus:outline-none focus:border-brand-500 transition-colors"
                placeholder="ICICI Lombard"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
              />
            </div>

            {/* Role */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-text-tertiary" htmlFor="role">Role</label>
              <select
                id="role"
                className="w-full bg-surface-raised border border-surface-border text-sm text-text-primary rounded-lg px-4 py-3 focus:outline-none focus:border-brand-500 transition-colors appearance-none"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                {roles.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Password */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-text-tertiary" htmlFor="password">Password</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  className="w-full bg-surface-raised border border-surface-border text-sm text-text-primary rounded-lg px-4 py-3 pr-12 focus:outline-none focus:border-brand-500 transition-colors"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary transition-colors focus:outline-none"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full mt-2 h-12 text-base font-semibold"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin mr-2" />
                  Creating account...
                </>
              ) : (
                "Create Account →"
              )}
            </Button>
          </form>

          <div className="h-px w-full bg-surface-border my-8" />

          {/* Trust badges in card */}
          <div className="flex justify-center gap-4 flex-wrap mb-6">
            {["IRDAI Compliant", "256-bit TLS", "SOC 2 Ready"].map((badge) => (
              <div
                key={badge}
                className="flex items-center gap-1.5 bg-brand-500/5 border border-brand-500/10 rounded-full px-3 py-1 font-mono-code text-[10px] text-text-secondary"
              >
                <ShieldCheck size={12} className="text-brand-500" />
                {badge}
              </div>
            ))}
          </div>

          <p className="text-center text-sm text-text-secondary">
            Already have an account?{" "}
            <Link
              to="/login"
              className="text-brand-500 font-semibold hover:underline"
            >
              Sign In
            </Link>
          </p>
        </Card>
      </div>
    </div>
  );
}
