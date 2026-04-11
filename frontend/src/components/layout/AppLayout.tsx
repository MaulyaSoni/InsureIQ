import { ReactNode, useState } from "react";
import { Menu, MessageSquare, X, Send, Bot } from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import AppSidebar from "./AppSidebar";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

interface ChatMessage {
  role: "user" | "ai";
  content: string;
  tokens?: string;
  time?: string;
}

const SUGGESTED_CHIPS = [
  "Explain risk factors",
  "Claim eligibility?",
  "Ways to lower premium",
];

export default function AppLayout({ children }: { children: ReactNode }) {
  const isMobile = useIsMobile();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "ai",
      content:
        "Hello! I'm the InsureIQ AI assistant powered by llama-3.3-70b. I understand your current page context. How can I help you analyze your portfolio today?",
      tokens: "128 tokens · 0.8s",
    },
  ]);
  const [chatLoading, setChatLoading] = useState(false);

  const handleSendChat = async () => {
    if (!chatInput.trim()) return;
    const userMsg = chatInput.trim();
    setChatInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setChatLoading(true);
    // Simulate LLM response
    await new Promise((r) => setTimeout(r, 1400 + Math.random() * 800));
    setMessages((prev) => [
      ...prev,
      {
        role: "ai",
        content: `Based on your query about "${userMsg}", our analysis indicates that the risk profile is driven primarily by vehicle usage patterns and prior claim history. The LangGraph pipeline has run risk scoring and SHAP attribution across the relevant policies. Would you like me to drill deeper into any specific factor?`,
        tokens: `${Math.floor(200 + Math.random() * 400)} tokens · ${(1.2 + Math.random() * 1.5).toFixed(1)}s`,
      },
    ]);
    setChatLoading(false);
  };

  const sidebar = (
    <AppSidebar onNavigate={isMobile ? () => setMobileOpen(false) : undefined} />
  );

  return (
    <div style={{ display: "flex", minHeight: "100vh", backgroundColor: "#07080D" }}>
      {/* Desktop Sidebar */}
      {!isMobile && sidebar}

      {/* Mobile Sheet */}
      {isMobile && (
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" style={{ width: 240, padding: 0, backgroundColor: "#0A0C14", border: "none" }}>
            <VisuallyHidden><SheetTitle>Navigation</SheetTitle></VisuallyHidden>
            <AppSidebar onNavigate={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>
      )}

      {/* Main scroll area */}
      <div
        style={{
          flex: 1,
          marginLeft: isMobile ? 0 : 240,
          display: "flex",
          flexDirection: "column",
          minHeight: "100vh",
          overflow: "hidden",
        }}
      >
        {/* Mobile topbar */}
        {isMobile && (
          <header
            style={{
              position: "sticky",
              top: 0,
              zIndex: 50,
              height: 52,
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "0 16px",
              backgroundColor: "#0A0C14",
              borderBottom: "1px solid #1E2535",
            }}
          >
            <button
              onClick={() => setMobileOpen(true)}
              style={{
                background: "transparent",
                border: "none",
                padding: 6,
                cursor: "pointer",
                color: "#8A95B0",
                display: "flex",
                alignItems: "center",
              }}
            >
              <Menu size={18} />
            </button>
            <span
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 14,
                fontWeight: 700,
                color: "#F0F4FF",
              }}
            >
              InsureIQ
            </span>
          </header>
        )}

        {/* Agent Status Bar */}
        <div className="agent-status-bar" style={{ flexShrink: 0 }}>
          <div className="agent-dot" />
          <span>Risk Node running</span>
          <span style={{ color: "#485068", margin: "0 4px" }}>·</span>
          <span>llama-3.3-70b</span>
          <span style={{ color: "#485068", margin: "0 4px" }}>·</span>
          <span>XGBoost + SHAP active</span>
          <span style={{ marginLeft: "auto", color: "#485068" }}>
            IRDAI Compliant · v2.4.1
          </span>
        </div>

        {/* Page content */}
        <main
          style={{
            flex: 1,
            overflowY: "auto",
            padding: isMobile ? "20px 16px" : "28px 32px",
          }}
        >
          {children}
        </main>
      </div>

      {/* AI Chat FAB */}
      <button
        className="ai-fab"
        onClick={() => setChatOpen(true)}
        title="Ask InsureIQ AI"
        style={{ display: chatOpen ? "none" : "flex" }}
      >
        <div className="ai-fab-ring" />
        <Bot size={22} color="#00D4FF" />
      </button>

      {/* Agent Chip */}
      {!chatOpen && (
        <div className="agent-chip">
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              backgroundColor: "#00D4FF",
              animation: "agentPulse 2s ease-in-out infinite",
            }}
          />
          Risk Node · llama-3.3-70b · 2.1s
        </div>
      )}

      {/* AI Chat Backdrop */}
      <div
        className={`ai-drawer-backdrop ${chatOpen ? "open" : ""}`}
        onClick={() => setChatOpen(false)}
      />

      {/* AI Chat Drawer */}
      <div className={`ai-drawer ${chatOpen ? "open" : ""}`}>
        {/* Header */}
        <div
          style={{
            height: 52,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 16px",
            borderBottom: "1px solid #1E2535",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Bot size={16} color="#00D4FF" />
            <span
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 13,
                fontWeight: 600,
                color: "#F0F4FF",
              }}
            >
              InsureIQ AI
            </span>
            <span
              style={{
                fontFamily: "'Roboto Mono', monospace",
                fontSize: 9,
                color: "#485068",
              }}
            >
              llama-3.3-70b
            </span>
          </div>
          <button
            onClick={() => setChatOpen(false)}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: "#485068",
              display: "flex",
              alignItems: "center",
              padding: 4,
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Context Badge */}
        <div style={{ padding: "10px 16px", flexShrink: 0 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              backgroundColor: "rgba(0,212,255,0.08)",
              border: "1px solid rgba(0,212,255,0.2)",
              borderRadius: 20,
              padding: "4px 12px",
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 11,
              color: "#00D4FF",
            }}
          >
            📋 Context: Current page · InsureIQ Portfolio
          </div>
        </div>

        {/* Messages */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "8px 16px",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          {messages.map((msg, i) =>
            msg.role === "user" ? (
              <div key={i} style={{ display: "flex", justifyContent: "flex-end" }}>
                <div
                  style={{
                    backgroundColor: "#0066FF",
                    color: "#fff",
                    borderRadius: 8,
                    padding: "10px 14px",
                    maxWidth: "80%",
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 13,
                    lineHeight: 1.5,
                  }}
                >
                  {msg.content}
                </div>
              </div>
            ) : (
              <div key={i} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <div
                  style={{
                    backgroundColor: "#0E1118",
                    border: "1px solid #1E2535",
                    borderLeft: "3px solid #00D4FF",
                    borderRadius: 8,
                    padding: "10px 14px",
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 13,
                    lineHeight: 1.6,
                    color: "#8A95B0",
                  }}
                >
                  {msg.content}
                </div>
                {msg.tokens && (
                  <span
                    style={{
                      fontFamily: "'Roboto Mono', monospace",
                      fontSize: 9,
                      color: "#485068",
                      paddingLeft: 4,
                    }}
                  >
                    {msg.tokens}
                  </span>
                )}
              </div>
            )
          )}

          {chatLoading && (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <div
                style={{
                  backgroundColor: "#0E1118",
                  border: "1px solid #1E2535",
                  borderLeft: "3px solid #00D4FF",
                  borderRadius: 8,
                  padding: "12px 14px",
                  display: "flex",
                  gap: 6,
                  alignItems: "center",
                }}
              >
                {[0, 1, 2].map((d) => (
                  <div
                    key={d}
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      backgroundColor: "#00D4FF",
                      animation: `agentPulse 1.2s ease-in-out ${d * 0.2}s infinite`,
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Suggested chips */}
        <div
          style={{
            padding: "8px 16px",
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            flexShrink: 0,
          }}
        >
          {SUGGESTED_CHIPS.map((chip) => (
            <button
              key={chip}
              onClick={() => setChatInput(chip)}
              style={{
                background: "transparent",
                border: "1px solid #1E2535",
                borderRadius: 20,
                padding: "5px 12px",
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 11,
                color: "#8A95B0",
                cursor: "pointer",
                transition: "all 150ms ease",
                whiteSpace: "nowrap",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = "#00D4FF";
                (e.currentTarget as HTMLElement).style.color = "#00D4FF";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = "#1E2535";
                (e.currentTarget as HTMLElement).style.color = "#8A95B0";
              }}
            >
              {chip}
            </button>
          ))}
        </div>

        {/* Input */}
        <div
          style={{
            padding: "12px 16px",
            borderTop: "1px solid #1E2535",
            flexShrink: 0,
            display: "flex",
            gap: 8,
          }}
        >
          <input
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendChat()}
            placeholder="Ask about policies, risks, premiums..."
            style={{
              flex: 1,
              backgroundColor: "#111622",
              border: "1px solid #1E2535",
              borderRadius: 6,
              color: "#F0F4FF",
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 13,
              padding: "10px 14px",
              outline: "none",
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "#00D4FF";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "#1E2535";
            }}
          />
          <button
            onClick={handleSendChat}
            disabled={!chatInput.trim() || chatLoading}
            style={{
              backgroundColor: "#0066FF",
              border: "none",
              borderRadius: 6,
              padding: "0 14px",
              cursor: chatInput.trim() ? "pointer" : "not-allowed",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              opacity: chatInput.trim() ? 1 : 0.5,
              transition: "opacity 150ms ease",
            }}
          >
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
