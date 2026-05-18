# InsureIQ — Production UI/UX Upgrade + Chatbot Master Prompt
# Stack: React + Tailwind + Shadcn + Framer Motion + Groq Streaming
# Design workflow: Stitch MCP → 21st.dev reference → implementation
# ═══════════════════════════════════════════════════════════════════

## READ THIS FIRST — PROJECT IDENTITY

InsureIQ is a B2B insurance intelligence platform used by:
- Underwriting analysts at Indian insurance companies
- Portfolio risk managers monitoring a book of business
- Insurance brokers managing multiple client policies

It is NOT a consumer app. The design language must communicate:
  authority, precision, trust, and intelligence
  — not fun, casual, or consumer-friendly

Every design decision should answer: "Does this look like something
ICICI Lombard's internal team would trust with real underwriting data?"

Current stack: React 18 + Vite + TypeScript + Tailwind CSS + Shadcn UI
Adding: Framer Motion for animations
Design reference: 21st.dev components, Linear.app aesthetic
Theming: full dark/light mode support — dark is the professional default

═══════════════════════════════════════════════════════════════════
SECTION 1 — DESIGN SYSTEM (implement this first, everything depends on it)
═══════════════════════════════════════════════════════════════════

## 1.1 — Color tokens (add to tailwind.config.ts and CSS variables)

```typescript
// tailwind.config.ts
export default {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Primary brand — deep violet (intelligence, precision)
        brand: {
          50:  '#EEEDFE',
          100: '#CECBF6',
          200: '#AFA9EC',
          300: '#8F86E3',
          400: '#7F77DD',
          500: '#6B63D4',
          600: '#534AB7',
          700: '#3C3489',
          800: '#26215C',
          900: '#160F30',
        },
        // Risk band colors — semantic, consistent everywhere
        risk: {
          low:      '#16A34A',
          'low-bg': '#F0FDF4',
          medium:   '#D97706',
          'medium-bg': '#FFFBEB',
          high:     '#EA580C',
          'high-bg': '#FFF7ED',
          critical: '#DC2626',
          'critical-bg': '#FEF2F2',
        },
        // Surface system — used for cards, panels, pages
        surface: {
          'page':    'var(--surface-page)',
          'card':    'var(--surface-card)',
          'raised':  'var(--surface-raised)',
          'overlay': 'var(--surface-overlay)',
          'border':  'var(--surface-border)',
          'border-strong': 'var(--surface-border-strong)',
        },
        // AI output identity — teal, distinct from brand violet
        ai: {
          DEFAULT: '#0891B2',
          light:   '#ECFEFF',
          border:  '#A5F3FC',
          dark:    '#0E7490',
        },
      },
      fontFamily: {
        sans:  ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
        mono:  ['JetBrains Mono', 'Fira Code', 'monospace'],
        display: ['Syne', 'Plus Jakarta Sans', 'sans-serif'],
      },
      fontSize: {
        'xs':   ['11px', { lineHeight: '16px', letterSpacing: '0.02em' }],
        'sm':   ['12px', { lineHeight: '18px' }],
        'base': ['14px', { lineHeight: '22px' }],
        'md':   ['15px', { lineHeight: '24px' }],
        'lg':   ['16px', { lineHeight: '26px' }],
        'xl':   ['18px', { lineHeight: '28px' }],
        '2xl':  ['20px', { lineHeight: '30px' }],
        '3xl':  ['24px', { lineHeight: '34px', fontWeight: '600' }],
        '4xl':  ['30px', { lineHeight: '40px', fontWeight: '700' }],
        'hero': ['40px', { lineHeight: '50px', fontWeight: '700' }],
      },
      boxShadow: {
        'card':    '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)',
        'card-hover': '0 4px 12px rgba(0,0,0,0.12), 0 2px 4px rgba(0,0,0,0.08)',
        'modal':   '0 20px 60px rgba(0,0,0,0.25)',
        'ai':      '0 0 0 1px rgba(8,145,178,0.2), 0 4px 16px rgba(8,145,178,0.08)',
        'brand':   '0 0 0 1px rgba(83,74,183,0.2), 0 4px 16px rgba(83,74,183,0.08)',
        'inset':   'inset 0 1px 2px rgba(0,0,0,0.06)',
      },
      borderRadius: {
        'sm': '6px',
        'md': '8px',
        'lg': '12px',
        'xl': '16px',
        '2xl': '20px',
      },
      animation: {
        'fade-in':     'fadeIn 0.2s ease-out',
        'slide-up':    'slideUp 0.3s ease-out',
        'slide-right': 'slideRight 0.3s ease-out',
        'scale-in':    'scaleIn 0.2s ease-out',
        'pulse-ai':    'pulseAI 2s ease-in-out infinite',
        'shimmer':     'shimmer 1.5s ease-in-out infinite',
        'cursor-blink':'cursorBlink 1s step-end infinite',
        'spin-slow':   'spin 3s linear infinite',
      },
      keyframes: {
        fadeIn:    { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp:   { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        slideRight:{ from: { opacity: '0', transform: 'translateX(-8px)' }, to: { opacity: '1', transform: 'translateX(0)' } },
        scaleIn:   { from: { opacity: '0', transform: 'scale(0.97)' }, to: { opacity: '1', transform: 'scale(1)' } },
        pulseAI:   { '0%,100%': { opacity: '1' }, '50%': { opacity: '0.6' } },
        shimmer:   { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
        cursorBlink: { '50%': { opacity: '0' } },
      },
    },
  },
};
```

```css
/* globals.css — CSS variables for surface system */
:root {
  --surface-page:         #F8F9FC;
  --surface-card:         #FFFFFF;
  --surface-raised:       #F2F4F8;
  --surface-overlay:      rgba(255,255,255,0.95);
  --surface-border:       rgba(0,0,0,0.08);
  --surface-border-strong:rgba(0,0,0,0.15);

  --text-primary:   #0F1117;
  --text-secondary: #4B5563;
  --text-tertiary:  #9CA3AF;
  --text-brand:     #534AB7;
  --text-ai:        #0891B2;
}

.dark {
  --surface-page:         #0C0E16;
  --surface-card:         #131520;
  --surface-raised:       #1A1D2A;
  --surface-overlay:      rgba(19,21,32,0.96);
  --surface-border:       rgba(255,255,255,0.07);
  --surface-border-strong:rgba(255,255,255,0.12);

  --text-primary:   #F1F2F6;
  --text-secondary: #9CA3AF;
  --text-tertiary:  #6B7280;
  --text-brand:     #A5A0F0;
  --text-ai:        #38BDF8;
}

/* Google Fonts import */
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&family=Syne:wght@600;700;800&display=swap');

body {
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  background-color: var(--surface-page);
  color: var(--text-primary);
  -webkit-font-smoothing: antialiased;
}
```

## 1.2 — Install required packages

```bash
npm install framer-motion
npm install @radix-ui/react-dialog @radix-ui/react-tooltip @radix-ui/react-scroll-area
npm install react-markdown remark-gfm
npm install lucide-react  # if not already installed
npm install class-variance-authority clsx tailwind-merge
```

## 1.3 — Core utility components to create first

### frontend/src/components/ui/Badge.tsx
```tsx
import { cva, type VariantProps } from 'class-variance-authority';

const badgeVariants = cva(
  'inline-flex items-center gap-1 font-medium transition-colors',
  {
    variants: {
      variant: {
        default:  'bg-brand-100 text-brand-700 dark:bg-brand-800 dark:text-brand-200',
        ai:       'bg-ai-light text-ai-dark dark:bg-ai-dark/30 dark:text-ai border border-ai-border/40',
        low:      'bg-risk-low-bg text-risk-low dark:bg-green-900/30 dark:text-green-400',
        medium:   'bg-risk-medium-bg text-risk-medium dark:bg-amber-900/30 dark:text-amber-400',
        high:     'bg-risk-high-bg text-risk-high dark:bg-orange-900/30 dark:text-orange-400',
        critical: 'bg-risk-critical-bg text-risk-critical dark:bg-red-900/30 dark:text-red-400',
        outline:  'border border-surface-border text-text-secondary',
        ghost:    'text-text-secondary hover:text-text-primary hover:bg-surface-raised',
      },
      size: {
        sm: 'text-xs px-2 py-0.5 rounded',
        md: 'text-sm px-2.5 py-1 rounded-md',
        lg: 'text-base px-3 py-1.5 rounded-lg',
      },
    },
    defaultVariants: { variant: 'default', size: 'md' },
  }
);

export function Badge({ variant, size, className, children, ...props }) {
  return (
    <span className={badgeVariants({ variant, size, className })} {...props}>
      {children}
    </span>
  );
}

export function RiskBadge({ band }: { band: string }) {
  const v = band?.toLowerCase() as any;
  return <Badge variant={v}>{band}</Badge>;
}
```

### frontend/src/components/ui/Card.tsx
```tsx
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'ai' | 'raised' | 'ghost';
  hoverable?: boolean;
  animate?: boolean;
  delay?: number;
}

export function Card({
  children, className, variant = 'default',
  hoverable = false, animate = true, delay = 0
}: CardProps) {
  const base = 'rounded-xl border transition-all duration-200';
  const variants = {
    default: 'bg-surface-card border-surface-border shadow-card',
    ai:      'bg-surface-card border-ai-border/40 shadow-ai',
    raised:  'bg-surface-raised border-surface-border',
    ghost:   'border-transparent',
  };
  const hover = hoverable
    ? 'hover:shadow-card-hover hover:-translate-y-0.5 cursor-pointer'
    : '';

  const Comp = animate ? motion.div : 'div';
  const animProps = animate ? {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.25, delay, ease: [0.22, 1, 0.36, 1] },
  } : {};

  return (
    <Comp
      className={cn(base, variants[variant], hover, className)}
      {...animProps}
    >
      {children}
    </Comp>
  );
}

export function AICard({ children, className, ...props }: CardProps) {
  return (
    <Card variant="ai" className={cn('relative', className)} {...props}>
      {/* AI indicator bar */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-ai to-brand-500 rounded-t-xl" />
      {/* AI badge */}
      <div className="absolute top-3 right-3">
        <Badge variant="ai" size="sm">AI</Badge>
      </div>
      {children}
    </Card>
  );
}
```

### frontend/src/components/ui/Skeleton.tsx
```tsx
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'animate-shimmer bg-gradient-to-r from-surface-raised via-surface-border to-surface-raised',
        'bg-[length:200%_100%] rounded-md',
        className
      )}
    />
  );
}

export function CardSkeleton() {
  return (
    <Card className="p-5 space-y-3">
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-8 w-1/2" />
      <Skeleton className="h-3 w-2/3" />
    </Card>
  );
}
```

═══════════════════════════════════════════════════════════════════
SECTION 2 — LAYOUT + NAVIGATION REDESIGN
═══════════════════════════════════════════════════════════════════

## 2.1 — AppLayout.tsx redesign

Redesign the main application shell. Replace current layout with:

```tsx
// frontend/src/components/layout/AppLayout.tsx
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();

  return (
    <div className="flex h-screen bg-surface-page overflow-hidden">
      {/* Sidebar */}
      <AppSidebar />

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <TopBar />

        {/* Agent status bar — only visible when graph is running */}
        <AgentStatusBar />

        {/* Page content with page transition */}
        <main className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="h-full"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* AI Chat Drawer — global, slides from right */}
      <ChatDrawer />
    </div>
  );
}
```

## 2.2 — AppSidebar.tsx redesign

```tsx
// Full sidebar redesign with:
// - Collapsed (64px) / expanded (240px) state with smooth animation
// - Logo at top: "InsureIQ" in Syne font with brand accent
// - Nav items with active indicator (left border + background fill)
// - Bottom: user avatar + name + role badge + settings icon
// - Dark/light toggle at bottom

const NAV_ITEMS = [
  { path: '/',              label: 'Dashboard',    icon: LayoutDashboard },
  { path: '/policies',      label: 'Policies',     icon: FileText },
  { path: '/risk',          label: 'Risk Engine',  icon: Shield },
  { path: '/claims',        label: 'Claims',       icon: AlertCircle },
  { path: '/premium',       label: 'Premium',      icon: TrendingUp },
  { path: '/reports',       label: 'Reports',      icon: BookOpen },
  { path: '/batch',         label: 'Batch',        icon: Layers },
  { path: '/audit',         label: 'Audit Log',    icon: History },
];

// Each nav item:
<motion.div
  className={cn(
    'flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer',
    'transition-colors duration-150 group',
    isActive
      ? 'bg-brand-100 dark:bg-brand-900/40 text-brand-600 dark:text-brand-300'
      : 'text-text-secondary hover:bg-surface-raised hover:text-text-primary'
  )}
  whileHover={{ x: 2 }}
  whileTap={{ scale: 0.98 }}
>
  <Icon size={18} className={cn(isActive ? 'text-brand-600 dark:text-brand-300' : '')} />
  <AnimatePresence>
    {isExpanded && (
      <motion.span
        initial={{ opacity: 0, width: 0 }}
        animate={{ opacity: 1, width: 'auto' }}
        exit={{ opacity: 0, width: 0 }}
        className="text-sm font-medium whitespace-nowrap overflow-hidden"
      >
        {item.label}
      </motion.span>
    )}
  </AnimatePresence>
</motion.div>
```

## 2.3 — TopBar redesign

```tsx
// Clean, minimal top bar
// Left: breadcrumb with current page name
// Center: Agent status bar (hidden when idle)
// Right: Chat AI button | Notifications | Theme toggle | Avatar

export function TopBar() {
  return (
    <header className="h-14 border-b border-surface-border bg-surface-card/80 backdrop-blur-sm flex items-center px-5 gap-4 z-10 shrink-0">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 flex-1">
        <span className="text-text-tertiary text-sm">InsureIQ</span>
        <ChevronRight size={14} className="text-text-tertiary" />
        <span className="text-text-primary text-sm font-medium">{pageTitle}</span>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-2">
        {/* Ask AI button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={openChat}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-ai-light dark:bg-ai-dark/20 text-ai text-sm font-medium border border-ai-border/30 hover:border-ai-border transition-all"
        >
          <Sparkles size={14} className="animate-pulse-ai" />
          Ask AI
        </motion.button>

        <NotificationBell />
        <ThemeToggle />
        <UserAvatar />
      </div>
    </header>
  );
}
```

## 2.4 — AgentStatusBar component

```tsx
// Slim bar below TopBar — only visible when LangGraph is running
export function AgentStatusBar() {
  const { isRunning, currentNode, model, elapsedMs } = useAgentStore();

  return (
    <AnimatePresence>
      {isRunning && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 32, opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="overflow-hidden"
        >
          <div className="h-8 bg-brand-50 dark:bg-brand-900/20 border-b border-brand-100 dark:border-brand-800 flex items-center px-5 gap-3">
            {/* Animated dot */}
            <motion.div
              className="w-2 h-2 rounded-full bg-brand-500"
              animate={{ scale: [1, 1.3, 1], opacity: [1, 0.7, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            <span className="text-xs font-medium text-brand-600 dark:text-brand-300">
              {currentNode ? `${currentNode} running` : 'Agent pipeline starting'}
            </span>
            {model && (
              <span className="text-xs font-mono text-brand-400 dark:text-brand-400">
                · {model}
              </span>
            )}
            {elapsedMs > 0 && (
              <span className="text-xs text-brand-400 ml-auto font-mono">
                {(elapsedMs / 1000).toFixed(1)}s
              </span>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

═══════════════════════════════════════════════════════════════════
SECTION 3 — PAGE-BY-PAGE REDESIGN
═══════════════════════════════════════════════════════════════════

## 3.1 — Dashboard (Index.tsx) redesign

```tsx
// Page structure:
// 1. Page header with greeting + date
// 2. KPI row (6 metric cards with animated counters)
// 3. Charts row (risk trend + risk split)
// 4. Bottom row (recent policies + AI activity feed)

// KPI Card component with animated counter:
export function KPICard({ label, value, delta, icon: Icon, color, delay }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    // Animate counter from 0 to value
    const duration = 800;
    const steps = 40;
    const increment = value / steps;
    let current = 0;
    const timer = setInterval(() => {
      current = Math.min(current + increment, value);
      setDisplayValue(Math.floor(current));
      if (current >= value) clearInterval(timer);
    }, duration / steps);
    return () => clearInterval(timer);
  }, [value]);

  return (
    <Card hoverable animate delay={delay} className="p-5">
      <div className="flex items-start justify-between mb-3">
        <div className={cn('p-2 rounded-lg', color.bg)}>
          <Icon size={16} className={color.text} />
        </div>
        {delta !== undefined && (
          <div className={cn('flex items-center gap-1 text-xs font-medium',
            delta >= 0 ? 'text-risk-low' : 'text-risk-critical'
          )}>
            {delta >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {Math.abs(delta)}%
          </div>
        )}
      </div>
      <div className="font-mono text-3xl font-semibold text-text-primary mb-1">
        {displayValue.toLocaleString()}
      </div>
      <div className="text-xs text-text-tertiary font-medium uppercase tracking-wide">
        {label}
      </div>
    </Card>
  );
}

// Page layout:
export default function Dashboard() {
  return (
    <div className="p-6 space-y-6 max-w-[1400px]">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">
            Good morning, {user.full_name.split(' ')[0]}
          </h1>
          <p className="text-sm text-text-tertiary mt-0.5">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download size={14} />
          Export
        </Button>
      </motion.div>

      {/* KPI row */}
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-4">
        {kpis.map((kpi, i) => <KPICard key={kpi.label} {...kpi} delay={i * 0.05} />)}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="col-span-2 p-5">
          <h3 className="text-sm font-semibold text-text-primary mb-4">Risk trend — 12 months</h3>
          <RiskTrendChart data={riskTrend} />
        </Card>
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-text-primary mb-4">Portfolio distribution</h3>
          <RiskDonutChart data={riskSplit} />
        </Card>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="col-span-2 p-5">
          <h3 className="text-sm font-semibold text-text-primary mb-4">Recent policies</h3>
          <RecentPoliciesTable policies={recentPolicies} />
        </Card>
        <AICard className="p-5">
          <h3 className="text-sm font-semibold text-text-primary mb-4 mt-4">Agent runs</h3>
          <AIActivityFeed runs={agentRuns} />
        </AICard>
      </div>
    </div>
  );
}
```

## 3.2 — PolicyDetails redesign (most important page)

```tsx
// Two-column layout with sticky AI panel
// This is the centrepiece demo page — must look exceptional

export default function PolicyDetails() {
  return (
    <div className="flex h-full">
      {/* Left column — policy information */}
      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        {/* Policy header */}
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/policies')} className="text-text-tertiary hover:text-text-primary transition-colors">
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold text-text-primary">{policy.policy_number}</h1>
              <RiskBadge band={latestPrediction?.risk_band || 'Unassessed'} />
            </div>
            <p className="text-sm text-text-secondary mt-0.5">{policy.policyholder_name}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm"><Edit2 size={14} /> Edit</Button>
          </div>
        </div>

        {/* Tab navigation */}
        <Tabs defaultValue="details">
          <TabsList className="border-b border-surface-border w-full justify-start rounded-none p-0 bg-transparent h-auto">
            {['Details', 'History', 'Documents', 'Policy Chat'].map(tab => (
              <TabsTrigger
                key={tab}
                value={tab.toLowerCase().replace(' ', '-')}
                className="border-b-2 border-transparent data-[state=active]:border-brand-500 rounded-none pb-3 pt-1 px-4"
              >
                {tab}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="details" className="pt-4">
            {/* Policy fields in a clean grid */}
            <PolicyFieldGrid policy={policy} />
          </TabsContent>

          <TabsContent value="policy-chat" className="pt-4">
            {/* Inline chat — not the drawer */}
            <PolicyInlineChat policyId={policy.id} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Right column — sticky AI intelligence panel */}
      <div className="w-[380px] shrink-0 border-l border-surface-border bg-surface-card overflow-y-auto">
        <IntelligencePanel policy={policy} prediction={latestPrediction} />
      </div>
    </div>
  );
}

// Intelligence Panel component
function IntelligencePanel({ policy, prediction }) {
  return (
    <div className="p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles size={16} className="text-ai" />
        <h3 className="text-sm font-semibold text-text-primary">Intelligence Panel</h3>
      </div>

      {/* Run Analysis button */}
      <AgentTrace
        policyId={policy.id}
        onComplete={handleComplete}
        onError={handleError}
      />

      {/* Results — animate in after analysis */}
      <AnimatePresence>
        {prediction && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            <RiskScoreCard prediction={prediction} />
            <SHAPBreakdownCard features={prediction.shap_features} />
            <PremiumCard premiumMin={result?.premium_min} premiumMax={result?.premium_max} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
```

## 3.3 — Shared page header component

```tsx
// Use on every page for consistency
export function PageHeader({
  title, subtitle, actions, breadcrumb
}: PageHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-start justify-between mb-6"
    >
      <div>
        {breadcrumb && (
          <div className="flex items-center gap-1.5 text-xs text-text-tertiary mb-1.5">
            {breadcrumb.map((b, i) => (
              <React.Fragment key={b}>
                {i > 0 && <ChevronRight size={12} />}
                <span>{b}</span>
              </React.Fragment>
            ))}
          </div>
        )}
        <h1 className="text-2xl font-semibold text-text-primary">{title}</h1>
        {subtitle && <p className="text-sm text-text-secondary mt-1">{subtitle}</p>}
      </div>
      {actions && (
        <div className="flex items-center gap-2 mt-1">
          {actions}
        </div>
      )}
    </motion.div>
  );
}
```

═══════════════════════════════════════════════════════════════════
SECTION 4 — CHATBOT COMPLETE REDESIGN
═══════════════════════════════════════════════════════════════════

## 4.1 — Chatbot identity and use case

The InsureIQ chatbot is NOT a generic assistant.
It is a specialist insurance underwriting copilot that knows:
- The current policy's full data (when on PolicyDetails)
- The entire portfolio composition (when on Dashboard)
- Indian motor insurance regulations (IRDAI)
- Risk scoring methodology (XGBoost + SHAP)
- Premium calculation logic

It should feel like talking to a senior underwriter who has read
all the data and can explain anything about it.

Chatbot name: "InsureIQ AI"
Persona: Senior insurance analyst, precise, professional, cites data

## 4.2 — ChatDrawer component (global, slides from right)

```tsx
// frontend/src/components/chat/ChatDrawer.tsx
import { motion, AnimatePresence } from 'framer-motion';
import { useStreamingChat } from '@/hooks/useStreamingChat';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  policyId?: string;    // If set, chat is policy-aware
  context?: string;     // Page context: 'dashboard' | 'policy' | 'risk' | 'claims'
}

export function ChatDrawer({ isOpen, onClose, policyId, context }: ChatDrawerProps) {
  const { messages, isLoading, sendMessage, clearMessages, suggestedPrompts } =
    useStreamingChat(policyId);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    sendMessage(input);
    setInput('');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop (subtle, doesn't block page) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/10 dark:bg-black/20 z-40"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 w-[420px] bg-surface-card border-l border-surface-border z-50 flex flex-col shadow-modal"
          >
            {/* Header */}
            <div className="h-14 border-b border-surface-border flex items-center px-5 gap-3 shrink-0">
              <div className="flex items-center gap-2 flex-1">
                <div className="w-7 h-7 rounded-full bg-ai-light dark:bg-ai-dark/30 flex items-center justify-center">
                  <Sparkles size={14} className="text-ai" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-text-primary">InsureIQ AI</div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-risk-low animate-pulse" />
                    <span className="text-[11px] text-text-tertiary">llama-3.3-70b · Active</span>
                  </div>
                </div>
              </div>

              {/* Context pill */}
              {policyId && (
                <Badge variant="ai" size="sm">
                  <FileText size={10} />
                  Policy context loaded
                </Badge>
              )}

              <div className="flex items-center gap-1">
                <button
                  onClick={clearMessages}
                  className="p-1.5 rounded-md text-text-tertiary hover:text-text-primary hover:bg-surface-raised transition-colors"
                  title="Clear chat"
                >
                  <Trash2 size={14} />
                </button>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-md text-text-tertiary hover:text-text-primary hover:bg-surface-raised transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Messages area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Welcome message (shown only when no messages) */}
              {messages.length === 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-3"
                >
                  <div className="flex items-start gap-3">
                    <AIAvatar />
                    <div className="flex-1">
                      <div className="bg-surface-raised rounded-xl rounded-tl-sm px-4 py-3">
                        <p className="text-sm text-text-primary leading-relaxed">
                          {policyId
                            ? "I've loaded the policy context. I can explain the risk score, SHAP factors, premium recommendation, or answer any question about this specific policy."
                            : "I'm your insurance underwriting copilot. Ask me about risk scores, claim eligibility, premium calculations, IRDAI regulations, or anything about your portfolio."
                          }
                        </p>
                      </div>
                      <div className="text-[11px] text-text-tertiary mt-1.5 ml-1">InsureIQ AI</div>
                    </div>
                  </div>

                  {/* Suggested prompts */}
                  <div className="space-y-1.5 mt-4">
                    <p className="text-[11px] text-text-tertiary uppercase tracking-wide font-medium px-1">
                      Suggested questions
                    </p>
                    {suggestedPrompts.map((prompt) => (
                      <motion.button
                        key={prompt}
                        whileHover={{ scale: 1.01, x: 2 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => sendMessage(prompt)}
                        className="w-full text-left text-sm text-text-secondary px-3 py-2 rounded-lg border border-surface-border hover:border-brand-200 dark:hover:border-brand-700 hover:bg-surface-raised hover:text-text-primary transition-all"
                      >
                        {prompt}
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Message list */}
              {messages.map((msg, i) => (
                <ChatMessage key={i} message={msg} isLast={i === messages.length - 1} />
              ))}

              {/* Loading indicator */}
              {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
                <div className="flex items-start gap-3">
                  <AIAvatar />
                  <div className="bg-surface-raised rounded-xl rounded-tl-sm px-4 py-3">
                    <ThinkingIndicator />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input area */}
            <div className="border-t border-surface-border p-4 shrink-0">
              <div className="flex items-end gap-2">
                <div className="flex-1 relative">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder={policyId
                      ? "Ask about this policy..."
                      : "Ask about your portfolio..."
                    }
                    rows={1}
                    className="w-full bg-surface-raised border border-surface-border rounded-xl px-4 py-3 text-sm text-text-primary placeholder-text-tertiary resize-none focus:outline-none focus:border-brand-400 dark:focus:border-brand-500 transition-colors max-h-32"
                    style={{ minHeight: '44px' }}
                  />
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className={cn(
                    'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                    'bg-brand-600 text-white transition-all',
                    (!input.trim() || isLoading)
                      ? 'opacity-40 cursor-not-allowed'
                      : 'hover:bg-brand-700 active:scale-95'
                  )}
                >
                  {isLoading
                    ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}><Loader2 size={16} /></motion.div>
                    : <SendHorizonal size={16} />
                  }
                </motion.button>
              </div>
              <p className="text-[11px] text-text-tertiary mt-2 text-center">
                Press Enter to send · Shift+Enter for new line
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Individual chat message component
function ChatMessage({ message, isLast }) {
  const isUser = message.role === 'user';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn('flex items-start gap-3', isUser && 'flex-row-reverse')}
    >
      {/* Avatar */}
      {isUser
        ? <UserAvatar size="sm" />
        : <AIAvatar />
      }

      {/* Bubble */}
      <div className={cn(
        'max-w-[82%] rounded-xl px-4 py-3',
        isUser
          ? 'bg-brand-600 text-white rounded-tr-sm'
          : 'bg-surface-raised text-text-primary rounded-tl-sm'
      )}>
        {isUser ? (
          <p className="text-sm leading-relaxed">{message.content}</p>
        ) : (
          <div className="text-sm leading-relaxed prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.content}
            </ReactMarkdown>
            {message.isStreaming && (
              <span className="inline-block w-0.5 h-4 bg-text-primary animate-cursor-blink ml-0.5 align-middle" />
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// AI avatar
function AIAvatar() {
  return (
    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-ai to-brand-500 flex items-center justify-center shrink-0 mt-0.5">
      <Sparkles size={12} className="text-white" />
    </div>
  );
}

// Thinking indicator (3 bouncing dots)
function ThinkingIndicator() {
  return (
    <div className="flex items-center gap-1 h-5">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-text-tertiary"
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
        />
      ))}
    </div>
  );
}
```

## 4.3 — Floating chat trigger button

```tsx
// frontend/src/components/chat/ChatFAB.tsx
// Floating action button — always visible bottom-right

export function ChatFAB() {
  const { isOpen, toggle } = useChatStore();
  const [hasNotification, setHasNotification] = useState(false);

  return (
    <motion.button
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 0.5, type: 'spring' }}
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.95 }}
      onClick={toggle}
      className={cn(
        'fixed bottom-6 right-6 z-30',
        'w-12 h-12 rounded-2xl shadow-brand',
        'flex items-center justify-center',
        'bg-brand-600 hover:bg-brand-700',
        'transition-colors',
        isOpen && 'bg-brand-700'
      )}
    >
      <AnimatePresence mode="wait">
        {isOpen ? (
          <motion.div
            key="close"
            initial={{ rotate: -90, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            exit={{ rotate: 90, opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <X size={20} className="text-white" />
          </motion.div>
        ) : (
          <motion.div
            key="open"
            initial={{ rotate: 90, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            exit={{ rotate: -90, opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <MessageSquare size={20} className="text-white" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notification dot */}
      {hasNotification && !isOpen && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute top-1 right-1 w-2.5 h-2.5 bg-risk-critical rounded-full border-2 border-white dark:border-surface-card"
        />
      )}
    </motion.button>
  );
}
```

## 4.4 — Policy inline chat (on PolicyDetails page)

```tsx
// frontend/src/components/chat/PolicyInlineChat.tsx
// Full-height chat interface inside the PolicyDetails tabs
// Pre-loaded with policy context — no need for the drawer

export function PolicyInlineChat({ policyId }: { policyId: string }) {
  const { messages, isLoading, sendMessage, suggestedPrompts } =
    useStreamingChat(policyId);
  const [input, setInput] = useState('');

  return (
    <div className="flex flex-col h-[520px] border border-surface-border rounded-xl overflow-hidden">
      {/* Context indicator */}
      <div className="px-4 py-2.5 border-b border-surface-border bg-ai-light dark:bg-ai-dark/20 flex items-center gap-2">
        <Sparkles size={13} className="text-ai" />
        <span className="text-[12px] font-medium text-ai">
          Policy context loaded — AI can reference all fields from this policy
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="space-y-2">
            <p className="text-xs text-text-tertiary uppercase tracking-wide font-medium">
              Ask about this policy
            </p>
            {suggestedPrompts.map(p => (
              <button
                key={p}
                onClick={() => sendMessage(p)}
                className="w-full text-left text-sm text-text-secondary px-3 py-2 rounded-lg border border-surface-border hover:bg-surface-raised hover:text-text-primary transition-all"
              >
                {p}
              </button>
            ))}
          </div>
        )}
        {messages.map((msg, i) => (
          <ChatMessage key={i} message={msg} isLast={i === messages.length - 1} />
        ))}
        {isLoading && <div className="flex gap-3"><AIAvatar /><div className="bg-surface-raised rounded-xl px-4 py-3"><ThinkingIndicator /></div></div>}
      </div>

      {/* Input */}
      <div className="border-t border-surface-border p-3 flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { sendMessage(input); setInput(''); } }}
          placeholder="Ask about this policy..."
          className="flex-1 bg-surface-raised border border-surface-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-400 transition-colors"
        />
        <button
          onClick={() => { sendMessage(input); setInput(''); }}
          disabled={!input.trim() || isLoading}
          className="px-3 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium disabled:opacity-40 hover:bg-brand-700 transition-colors"
        >
          <SendHorizonal size={14} />
        </button>
      </div>
    </div>
  );
}
```

═══════════════════════════════════════════════════════════════════
SECTION 5 — FRAMER MOTION ANIMATION PATTERNS
═══════════════════════════════════════════════════════════════════

## 5.1 — Reusable motion variants

```typescript
// frontend/src/lib/motion.ts
import { Variants } from 'framer-motion';

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] } },
};

export const staggerContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.2, ease: [0.22, 1, 0.36, 1] } },
};

export const slideInRight: Variants = {
  hidden: { opacity: 0, x: 20 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] } },
};

// Use for lists — wrap parent in motion.div with staggerContainer
// wrap each item with motion.div and fadeInUp
export function AnimatedList({ children, className }) {
  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className={className}
    >
      {React.Children.map(children, child => (
        <motion.div variants={fadeInUp}>{child}</motion.div>
      ))}
    </motion.div>
  );
}
```

## 5.2 — Risk score gauge animation

```tsx
// Animated risk score ring — use on RiskAssessment and PolicyDetails
export function RiskGauge({ score, band }: { score: number; band: string }) {
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedScore(score), 100);
    return () => clearTimeout(timer);
  }, [score]);

  const strokeDashoffset = circumference - (animatedScore / 100) * circumference * 0.75;
  const bandColors = {
    LOW: '#16A34A', MEDIUM: '#D97706', HIGH: '#EA580C', CRITICAL: '#DC2626'
  };
  const color = bandColors[band] || '#6B7280';

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-40 h-32">
        <svg className="w-full h-full -rotate-[135deg]" viewBox="0 0 160 160">
          {/* Track */}
          <circle
            cx="80" cy="80" r={radius}
            fill="none" stroke="currentColor"
            strokeWidth="10" className="text-surface-border"
            strokeDasharray={`${circumference * 0.75} ${circumference * 0.25}`}
            strokeLinecap="round"
          />
          {/* Progress */}
          <motion.circle
            cx="80" cy="80" r={radius}
            fill="none" stroke={color}
            strokeWidth="10"
            strokeDasharray={`${circumference * 0.75} ${circumference * 0.25}`}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
            strokeLinecap="round"
          />
        </svg>
        {/* Score number */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pt-4">
          <motion.span
            className="font-mono text-3xl font-bold"
            style={{ color }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            {Math.round(animatedScore)}
          </motion.span>
          <span className="text-xs text-text-tertiary">/100</span>
        </div>
      </div>
      <RiskBadge band={band} />
    </div>
  );
}
```

═══════════════════════════════════════════════════════════════════
SECTION 6 — STITCH MCP PROMPTS (run these in Stitch)
═══════════════════════════════════════════════════════════════════

## Stitch session 1 — Design system + core components

```
Generate a production-grade design system for InsureIQ, a B2B insurance 
underwriting analytics platform. 

Design language: Linear.app-inspired (clean, precise, minimal) 
combined with financial terminal precision (Bloomberg/Refinitiv aesthetic 
for data tables and metrics).

Audience: Insurance underwriters and risk analysts at Indian insurance 
companies. Must communicate: authority, precision, institutional trust.

Color system:
  Brand: Deep violet #534AB7 (intelligence, precision)
  AI outputs: Teal #0891B2 (distinct from brand)
  Risk LOW: #16A34A | MEDIUM: #D97706 | HIGH: #EA580C | CRITICAL: #DC2626
  Dark surfaces: #0C0E16 page, #131520 card, #1A1D2A raised
  Light surfaces: #F8F9FC page, #FFFFFF card, #F2F4F8 raised

Generate these components:
1. Navigation sidebar (collapsed 64px / expanded 240px)
   - Logo: "InsureIQ" in Syne font, brand color
   - Nav items with hover and active states
   - Active state: left border accent + subtle fill
   - User profile section at bottom

2. KPI metric card
   - Icon in colored circle (16px icon, 32px circle)
   - Large mono number (40px, JetBrains Mono)
   - Label below (11px, uppercase, letter-spaced)
   - Delta indicator (up/down arrow + %)
   - Subtle hover: lift shadow

3. Risk band badge system
   - LOW / MEDIUM / HIGH / CRITICAL variants
   - Each with matching bg/text color
   - Pill shape, 10px uppercase text

4. AI output card (distinct from regular cards)
   - 3px teal top border
   - Subtle teal border glow
   - "AI" badge top-right (teal)
   - Slightly elevated vs regular cards

5. Data table row
   - Hover state: brand-50 fill
   - Risk band column: colored dot + text
   - Mono font for policy numbers, timestamps, amounts
   - Action buttons (view, analyze, more) appear on hover

6. Button variants
   - Primary: brand-600 fill, white text, 8px radius
   - Secondary: outline, brand border
   - Ghost: transparent
   - AI trigger: teal fill with sparkle icon
   - Danger: red fill

Both dark and light mode for all components.
```

## Stitch session 2 — Dashboard screen

```
Design the InsureIQ dashboard screen for a B2B insurance analytics platform.
Use the design system from session 1.

Layout: Fixed sidebar (240px) + main content area
Top bar: 56px with breadcrumb, "Ask AI" button (teal), notifications, avatar

Main content sections:

1. Page header
   "Good morning, Rajesh" (24px, semibold) + date in mono (muted)
   Export button (outline, right-aligned)

2. KPI row — 6 cards in a grid
   Total Policies: 247 (blue icon)
   Avg Risk Score: 42.3 (orange icon)  
   High Risk: 35 (red icon)
   Critical Alerts: 13 (red pulsing icon)
   Claims Predicted: 89 (amber icon)
   Avg Claim Prob: 36.2% (purple icon)
   
3. Charts row — 2/3 + 1/3 split
   Left: Area chart "Risk Trend — 12 months"
   Lines: LOW (green), MEDIUM (amber), HIGH (orange), CRITICAL (red)
   Right: Donut chart "Portfolio distribution" with legend

4. Bottom row — 2/3 + 1/3 split
   Left: "Recent Policies" table (5 rows)
     Columns: Policy No | Holder | Vehicle | Risk Band | Action
   Right: "Agent Runs" feed (AI-styled card)
     Show last 5 LangGraph runs as timeline items
     Each: policy name + node path (S→R→E→P) + model name + time ago

Dark mode default. Show light mode variant for the charts section.
Clean, spacious, institutional — not colorful or consumer-facing.
```

## Stitch session 3 — Chatbot component

```
Design the InsureIQ AI chat drawer component — a slide-in panel from the 
right side of the screen, 420px wide, full height.

This is a specialist insurance copilot chat, NOT a generic assistant.
Design language: professional, precise, like a Bloomberg terminal chat.

Sections:

1. Header (56px)
   Left: AI avatar (gradient circle, sparkle icon) + "InsureIQ AI" name 
         + "● llama-3.3-70b · Active" status line (11px, mono, green dot)
   Center: "Policy context loaded" badge (teal, small) when on policy page
   Right: Clear chat icon + Close icon

2. Messages area (flex-1, scrollable)
   Welcome state (no messages):
     - AI bubble with greeting text
     - "Suggested questions" section below
     - 4 contextual prompt chips (teal bordered, ghost style)
   
   User message bubble:
     - Right-aligned, brand-600 fill, white text
     - Rounded-tr-none (tail on right)
     - User avatar (initials circle) on far right
   
   AI message bubble:
     - Left-aligned, surface-raised fill, primary text
     - Rounded-tl-none (tail on left)
     - AI avatar on far left
     - Supports markdown rendering (headers, bold, code, lists)
     - Streaming cursor: blinking vertical bar at text end
   
   Thinking state:
     - AI bubble with 3 bouncing dots animation

3. Input area (border-top, 72px)
   Textarea (auto-resize, max 5 lines)
   Send button: brand-600, rounded-xl, send icon
   Hint: "Enter to send · Shift+Enter for newline" (11px, center, muted)

4. Floating trigger button
   Fixed bottom-right, 48px circle
   Brand-600 background
   MessageSquare icon (white)
   Animates: rotate when opening/closing (X icon)
   Notification dot for unread: red, top-right

Show open state (mid-conversation), welcome state (empty), and 
streaming state (AI typing with cursor).
Dark mode default + light mode variant.
```

═══════════════════════════════════════════════════════════════════
SECTION 7 — 21ST.DEV REFERENCE COMPONENTS
═══════════════════════════════════════════════════════════════════

## Components to reference on 21st.dev for inspiration

When implementing, visit these searches on 21st.dev for UI patterns:

1. "data table dark" — for Policies list and Audit log tables
   Reference: how hover states, selection, and action buttons appear
   
2. "metric card animated" — for KPI cards
   Reference: counter animations, icon treatments, delta arrows
   
3. "streaming chat" — for the chatbot
   Reference: bubble styles, typing indicators, markdown rendering
   
4. "side panel drawer" — for the chat drawer
   Reference: animation timing, backdrop treatment
   
5. "risk gauge" / "score ring" — for risk score visualization
   Reference: arc gauges, animated fills, score labels
   
6. "timeline vertical" — for agent trace visualization
   Reference: step indicators, connector lines, status states
   
7. "tabs underline" — for PolicyDetails tabs
   Reference: the Linear-style underline tab pattern
   
8. "toast notification" — for system feedback
   Reference: position, animation, type variants (success/error/info)

═══════════════════════════════════════════════════════════════════
SECTION 8 — IMPLEMENTATION ORDER
═══════════════════════════════════════════════════════════════════

Build in this exact order. Each step must be complete before the next.

STEP 1 — Design tokens (1 hour)
  Install fonts (Plus Jakarta Sans, JetBrains Mono, Syne)
  Update tailwind.config.ts with full color/font/shadow/animation tokens
  Update globals.css with CSS variables for surface system
  Test: dark/light mode toggle works, fonts load correctly

STEP 2 — Core UI components (2–3 hours)
  Create: Badge.tsx, Card.tsx, AICard.tsx, Skeleton.tsx
  Update: Button.tsx to match new design tokens
  Create: motion.ts with reusable Framer Motion variants
  Create: PageHeader.tsx shared header component
  Test: render each component in isolation

STEP 3 — Layout redesign (2 hours)
  Update: AppLayout.tsx with page transition animation
  Redesign: AppSidebar.tsx with collapse/expand, new nav styling
  Redesign: TopBar.tsx with Ask AI button
  Create: AgentStatusBar.tsx
  Test: navigation between all pages works with transitions

STEP 4 — Chatbot (3–4 hours)
  Create: ChatDrawer.tsx (full implementation from Section 4)
  Create: ChatFAB.tsx (floating trigger)
  Create: PolicyInlineChat.tsx
  Update: useStreamingChat.ts hook (from previous prompt)
  Create: useChatStore.ts (Zustand store for open/close state)
  Wire: ChatFAB in AppLayout, ChatDrawer in AppLayout
  Wire: PolicyInlineChat in PolicyDetails tab
  Test: streaming works, markdown renders, suggested prompts work

STEP 5 — Dashboard redesign (2 hours)
  Update: Index.tsx with KPI cards, chart layouts, activity feed
  Create: KPICard.tsx with animated counter
  Create: AIActivityFeed.tsx
  Test: real data from /dashboard/kpis endpoint populates

STEP 6 — PolicyDetails redesign (2 hours)
  Redesign: PolicyDetails.tsx with sticky AI panel
  Create: IntelligencePanel.tsx
  Integrate: AgentTrace component
  Create: PolicyFieldGrid.tsx
  Test: run-all triggers trace UI, results animate in

STEP 7 — Agent trace component (2 hours — from previous prompt)
  Create: AgentTrace.tsx (full SSE-driven trace)
  Add: emit_trace_event() to all 5 LangGraph nodes
  Create: /policies/{id}/run-all/stream SSE endpoint
  Test: nodes light up in sequence, tokens stream into explanation

STEP 8 — Remaining pages polish (2 hours)
  Apply PageHeader to all pages
  Add AnimatedList to Policies page table
  Add RiskGauge to RiskAssessment page
  Add consistent card/table styling to Claims, Premium, Reports
  Add loading skeletons to all data-fetching states

STEP 9 — Global polish (1 hour)
  Add ToastProvider + toast notifications for all actions
  Add global error boundary with graceful fallback
  Verify dark/light mode on every page
  Verify responsive layout at 1280px, 1440px, 1920px
  Run: npm run build — fix any TypeScript errors

═══════════════════════════════════════════════════════════════════
SECTION 9 — ZUSTAND STORES (state management)
═══════════════════════════════════════════════════════════════════

```typescript
// frontend/src/stores/useChatStore.ts
import { create } from 'zustand';

interface ChatStore {
  isOpen: boolean;
  policyId: string | null;
  context: string;
  open: (policyId?: string, context?: string) => void;
  close: () => void;
  toggle: () => void;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  isOpen: false,
  policyId: null,
  context: 'general',
  open: (policyId, context = 'general') =>
    set({ isOpen: true, policyId: policyId || null, context }),
  close: () => set({ isOpen: false }),
  toggle: () => set(s => ({ isOpen: !s.isOpen })),
}));

// frontend/src/stores/useAgentStore.ts
interface AgentStore {
  isRunning: boolean;
  currentNode: string | null;
  model: string | null;
  elapsedMs: number;
  startRun: (node: string, model: string) => void;
  updateNode: (node: string, model: string) => void;
  endRun: () => void;
}

export const useAgentStore = create<AgentStore>((set) => ({
  isRunning: false,
  currentNode: null,
  model: null,
  elapsedMs: 0,
  startRun: (node, model) => set({ isRunning: true, currentNode: node, model, elapsedMs: 0 }),
  updateNode: (node, model) => set({ currentNode: node, model }),
  endRun: () => set({ isRunning: false, currentNode: null, model: null }),
}));
```

═══════════════════════════════════════════════════════════════════
SECTION 10 — FINAL QUALITY CHECKLIST
═══════════════════════════════════════════════════════════════════

Before marking UI work complete, verify every item:

DESIGN CONSISTENCY
  □ All pages use the same PageHeader component
  □ All cards use Card.tsx or AICard.tsx — no raw divs styled as cards
  □ All risk badges use RiskBadge — no inline colored text
  □ All buttons use Button.tsx variants — no raw button elements
  □ Typography: body=14px Plus Jakarta Sans, numbers=JetBrains Mono
  □ Dark/light mode: every element readable in both modes

ANIMATIONS
  □ Page transitions: AnimatePresence with 200ms fade+slide
  □ Card hover: shadow lift + 2px translate
  □ KPI cards: number counter animation on mount
  □ Risk gauge: arc fill animation on mount
  □ Chat messages: fade-in-up on each new message
  □ Agent trace: sequential node fill animation
  □ Chatbot drawer: spring slide-in from right

CHATBOT QUALITY
  □ Streaming works: text appears word-by-word (not all at once)
  □ Markdown renders: bold, bullets, code blocks in AI responses
  □ Thinking indicator: 3 bouncing dots while loading
  □ Suggested prompts: 4 context-aware prompts on welcome screen
  □ Policy context: on PolicyDetails, AI mentions policy fields by name
  □ Clear chat: works, returns to welcome screen
  □ Rate limit: shows friendly message when Groq 429s

PERFORMANCE
  □ No layout shift on load
  □ Skeleton loaders on all data-fetching states
  □ AnimatePresence exits before new content enters
  □ Chat messages scroll to bottom automatically
  □ Build passes: npm run build with zero errors
