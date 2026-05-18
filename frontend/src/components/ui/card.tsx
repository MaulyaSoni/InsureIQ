import * as React from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { Badge } from "./badge"

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: "default" | "ai" | "raised" | "ghost";
  hoverable?: boolean;
  animate?: boolean;
  delay?: number;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ children, className, variant = "default", hoverable = false, animate = true, delay = 0, ...props }, ref) => {
    const base = "rounded-xl border transition-all duration-200"
    const variants = {
      default: "bg-surface-card border-surface-border shadow-card",
      ai:      "bg-surface-card border-ai-border/40 shadow-ai",
      raised:  "bg-surface-raised border-surface-border",
      ghost:   "border-transparent",
    }
    const hover = hoverable
      ? "hover:shadow-card-hover hover:-translate-y-0.5 cursor-pointer"
      : ""

    if (!animate) {
      return (
        <div
          ref={ref}
          className={cn(base, variants[variant], hover, className)}
          {...props}
        >
          {children}
        </div>
      )
    }

    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay, ease: [0.22, 1, 0.36, 1] }}
        className={cn(base, variants[variant], hover, className)}
        {...props}
      >
        {children}
      </motion.div>
    )
  }
)
Card.displayName = "Card"

const AICard = React.forwardRef<HTMLDivElement, CardProps>(
  ({ children, className, ...props }, ref) => {
    return (
      <Card ref={ref} variant="ai" className={cn("relative", className)} {...props}>
        {/* AI indicator bar */}
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-ai to-brand-500 rounded-t-xl" />
        {/* AI badge */}
        <div className="absolute top-3 right-3">
          <Badge variant="ai" size="sm">AI</Badge>
        </div>
        {children}
      </Card>
    )
  }
)
AICard.displayName = "AICard"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "font-semibold leading-none tracking-tight text-text-primary",
      className
    )}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-text-secondary", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent, AICard }
