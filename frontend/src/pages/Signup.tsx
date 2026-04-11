import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { Zap, Loader2, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

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
      {/* Grid bg */}
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
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 600,
          height: 600,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(0,102,255,0.07) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      <div style={{ width: "100%", maxWidth: 480, position: "relative", zIndex: 1 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
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
            Create Your Enterprise Account
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
              fontSize: 15,
              fontWeight: 600,
              color: "#F0F4FF",
              marginBottom: 24,
            }}
          >
            Request Access
          </div>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {/* Name */}
            <div>
              <label className="nu-label" htmlFor="name">Full Name</label>
              <input
                id="name"
                type="text"
                className="nu-input"
                placeholder="John Smith"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            {/* Email */}
            <div>
              <label className="nu-label" htmlFor="email">Work Email</label>
              <input
                id="email"
                type="email"
                className="nu-input"
                placeholder="john@icici-lombard.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {/* Company */}
            <div>
              <label className="nu-label" htmlFor="company">Organization</label>
              <input
                id="company"
                type="text"
                className="nu-input"
                placeholder="ICICI Lombard"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
              />
            </div>

            {/* Role */}
            <div>
              <label className="nu-label" htmlFor="role">Role</label>
              <select
                id="role"
                className="nu-select"
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

            <button
              type="submit"
              className="nu-btn-primary"
              disabled={loading}
              style={{ width: "100%", justifyContent: "center", marginTop: 4, height: 48, fontSize: 14 }}
            >
              {loading ? (
                <>
                  <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
                  Creating account...
                </>
              ) : (
                "Create Account →"
              )}
            </button>
          </form>

          <hr className="nu-divider" style={{ margin: "24px 0" }} />

          {/* Trust badges in card */}
          <div style={{ display: "flex", justifyContent: "center", gap: 16, flexWrap: "wrap", marginBottom: 16 }}>
            {["IRDAI Compliant", "256-bit TLS", "SOC 2 Ready"].map((badge) => (
              <div
                key={badge}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  backgroundColor: "rgba(0,212,255,0.05)",
                  border: "1px solid rgba(0,212,255,0.15)",
                  borderRadius: 20,
                  padding: "4px 10px",
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 9,
                  color: "#485068",
                }}
              >
                <ShieldCheck size={10} color="#00D4FF" />
                {badge}
              </div>
            ))}
          </div>

          <p
            style={{
              textAlign: "center",
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 13,
              color: "#485068",
            }}
          >
            Already have an account?{" "}
            <Link
              to="/login"
              style={{ color: "#00D4FF", textDecoration: "none", fontWeight: 500 }}
              onMouseEnter={(e) => ((e.target as HTMLElement).style.textDecoration = "underline")}
              onMouseLeave={(e) => ((e.target as HTMLElement).style.textDecoration = "none")}
            >
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
