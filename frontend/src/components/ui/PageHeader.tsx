import React from "react"
import { motion } from "framer-motion"
import { ChevronRight } from "lucide-react"

interface PageHeaderProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
  breadcrumb?: string[]
}

export function PageHeader({
  title,
  subtitle,
  actions,
  breadcrumb
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
  )
}
