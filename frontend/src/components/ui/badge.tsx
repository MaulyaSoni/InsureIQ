import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center gap-1 font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-brand-100 text-brand-700 dark:bg-brand-800 dark:text-brand-200",
        ai:      "bg-ai-light text-ai-dark dark:bg-ai-dark/30 dark:text-ai border border-ai-border/40",
        low:      "bg-risk-low-bg text-risk-low dark:bg-green-900/30 dark:text-green-400",
        medium:   "bg-risk-medium-bg text-risk-medium dark:bg-amber-900/30 dark:text-amber-400",
        high:     "bg-risk-high-bg text-risk-high dark:bg-orange-900/30 dark:text-orange-400",
        critical: "bg-risk-critical-bg text-risk-critical dark:bg-red-900/30 dark:text-red-400",
        outline:  "border border-surface-border text-text-secondary",
        ghost:    "text-text-secondary hover:text-text-primary hover:bg-surface-raised",
      },
      size: {
        sm: "text-xs px-2 py-0.5 rounded",
        md: "text-sm px-2.5 py-1 rounded-md",
        lg: "text-base px-3 py-1.5 rounded-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant, size }), className)} {...props} />
  )
}

function RiskBadge({ band }: { band: string }) {
  const v = band?.toLowerCase() as any
  return <Badge variant={v}>{band}</Badge>
}

export { Badge, badgeVariants, RiskBadge }
