import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { Zap, Loader2, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success("Welcome back to InsureIQ Intelligence");
      navigate("/");
    } catch (err: any) {
      toast.error(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background grid pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(83,74,183,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(83,74,183,0.03)_1px,transparent_1px)] bg-[size:48px_48px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[radial-gradient(circle,rgba(83,74,183,0.07)_0%,transparent_70%)] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-[440px] relative z-10"
      >
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand-500/10 border border-brand-500/20 mb-4 shadow-xl shadow-brand-500/10">
            <Zap size={32} className="text-brand-500 fill-brand-500/20" />
          </div>
          <div className="font-mono-code text-3xl font-bold text-text-primary tracking-tight">
            InsureIQ
          </div>
          <div className="text-sm text-text-secondary mt-2">
            Neural Risk Prediction Platform
          </div>
        </div>

        {/* Card */}
        <Card className="p-8 shadow-2xl shadow-black/50 border-surface-border-strong">
          <div className="font-mono-code text-base font-semibold text-text-primary mb-1">
            Authentication
          </div>
          <p className="text-sm text-text-secondary mb-8">
            Access your enterprise risk dashboard
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            {/* Email */}
            <div className="flex flex-col gap-2">
              <label htmlFor="email" className="text-[10px] font-bold uppercase tracking-widest text-text-tertiary">
                Enterprise Email
              </label>
              <input
                id="email"
                type="email"
                placeholder="analyst@insureiq.ai"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-surface-raised border border-surface-border text-sm text-text-primary rounded-lg px-4 py-3 focus:outline-none focus:border-brand-500 transition-all font-mono-code"
              />
            </div>

            {/* Password */}
            <div className="flex flex-col gap-2">
              <label htmlFor="password" className="text-[10px] font-bold uppercase tracking-widest text-text-tertiary">
                Secure Key
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full bg-surface-raised border border-surface-border text-sm text-text-primary rounded-lg px-4 py-3 pr-11 focus:outline-none focus:border-brand-500 transition-all"
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
              className="w-full mt-2 h-12 text-base font-bold shadow-lg shadow-brand-500/20"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin mr-2" />
                  Verifying...
                </>
              ) : (
                'Initialize Session →'
              )}
            </Button>
          </form>

          <div className="h-px w-full bg-surface-border my-8" />

          <p className="text-center text-sm text-text-secondary">
            Authorized access only.{" "}
            <Link
              to="/signup"
              className="text-brand-500 font-bold hover:underline"
            >
              Request Access
            </Link>
          </p>
        </Card>

        {/* Ported trust badges */}
        <div className="flex justify-center gap-6 mt-8 flex-wrap">
          {['IRDAI Compliant', '256-bit TLS', 'SOC 2 Ready'].map((badge) => (
            <div
              key={badge}
              className="flex items-center gap-1.5 font-mono-code text-[9px] text-text-tertiary uppercase tracking-tighter"
            >
              <ShieldCheck size={12} className="text-brand-500" />
              {badge}
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
