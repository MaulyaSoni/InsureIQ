import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { Zap, Loader2, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

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
      toast.success("Welcome back to InsureIQ");
      navigate("/");
    } catch (err: any) {
      toast.error(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#07080D",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background grid pattern */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(rgba(0,212,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.03) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          pointerEvents: "none",
        }}
      />
      {/* Radial glow */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 600,
          height: 600,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(0,102,255,0.08) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      <div style={{ width: "100%", maxWidth: 440, position: "relative", zIndex: 1 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 52,
              height: 52,
              borderRadius: 12,
              background: "rgba(0,212,255,0.1)",
              border: "1px solid rgba(0,212,255,0.25)",
              marginBottom: 16,
            }}
          >
            <Zap size={24} color="#00D4FF" />
          </div>
          <div
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 26,
              fontWeight: 700,
              color: "#F0F4FF",
              letterSpacing: "-0.02em",
            }}
          >
            InsureIQ
          </div>
          <div
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 14,
              color: "#8A95B0",
              marginTop: 6,
            }}
          >
            AI Risk Analytics Platform
          </div>
        </div>

        {/* Card */}
        <div
          style={{
            backgroundColor: "#0E1118",
            border: "1px solid #1E2535",
            borderRadius: 12,
            padding: "36px 32px",
            boxShadow: "0 8px 40px rgba(0,0,0,0.4)",
          }}
        >
          <div
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 16,
              fontWeight: 600,
              color: "#F0F4FF",
              marginBottom: 6,
            }}
          >
            Sign in
          </div>
          <div
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 13,
              color: "#485068",
              marginBottom: 28,
            }}
          >
            Access your underwriting intelligence dashboard
          </div>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Email */}
            <div>
              <label className="nu-label" htmlFor="email">Email Address</label>
              <input
                id="email"
                type="email"
                className="nu-input"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {/* Password */}
            <div>
              <label className="nu-label" htmlFor="password">Password</label>
              <div style={{ position: "relative" }}>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  className="nu-input"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{ paddingRight: 44 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: "absolute",
                    right: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "#485068",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="nu-btn-primary"
              disabled={loading}
              style={{ width: "100%", justifyContent: "center", marginTop: 4, height: 48, fontSize: 14 }}
            >
              {loading ? (
                <>
                  <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
                  Authenticating...
                </>
              ) : (
                "Sign In →"
              )}
            </button>
          </form>

          <hr className="nu-divider" style={{ margin: "24px 0" }} />

          <p
            style={{
              textAlign: "center",
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 13,
              color: "#485068",
            }}
          >
            Don't have an account?{" "}
            <Link
              to="/signup"
              style={{ color: "#00D4FF", textDecoration: "none", fontWeight: 500 }}
              onMouseEnter={(e) => ((e.target as HTMLElement).style.textDecoration = "underline")}
              onMouseLeave={(e) => ((e.target as HTMLElement).style.textDecoration = "none")}
            >
              Request Access
            </Link>
          </p>
        </div>

        {/* Trust badges */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 20,
            marginTop: 24,
            flexWrap: "wrap",
          }}
        >
          {["IRDAI Compliant", "256-bit TLS", "SOC 2 Ready"].map((badge) => (
            <div
              key={badge}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 10,
                color: "#485068",
              }}
            >
              <ShieldCheck size={11} color="#485068" />
              {badge}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
