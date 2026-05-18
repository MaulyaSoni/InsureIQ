import { cn } from "@/lib/utils"
import { Card } from "./card"

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-shimmer bg-gradient-to-r from-surface-raised via-surface-border to-surface-raised",
        "bg-[length:200%_100%] rounded-md",
        className
      )}
    />
  )
}

export function CardSkeleton() {
  return (
    <Card className="p-5 space-y-3">
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-8 w-1/2" />
      <Skeleton className="h-3 w-2/3" />
    </Card>
  )
}
