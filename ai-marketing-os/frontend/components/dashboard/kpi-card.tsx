"use client"

import { motion } from "framer-motion"
import { TrendingUp, TrendingDown, Minus, type LucideIcon } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

interface KpiCardProps {
  title: string
  value: string | number
  change: number
  changeLabel: string
  icon: LucideIcon
  prefix?: string
  suffix?: string
  isLoading?: boolean
  variant?: "default" | "success" | "warning" | "danger"
}

const variantStyles = {
  default: {
    icon: "bg-primary/10 text-primary",
    badge: "text-primary",
  },
  success: {
    icon: "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400",
    badge: "text-green-600 dark:text-green-400",
  },
  warning: {
    icon: "bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400",
    badge: "text-yellow-600 dark:text-yellow-400",
  },
  danger: {
    icon: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
    badge: "text-red-600 dark:text-red-400",
  },
}

export function KpiCard({
  title,
  value,
  change,
  changeLabel,
  icon: Icon,
  prefix = "",
  suffix = "",
  isLoading = false,
  variant = "default",
}: KpiCardProps) {
  const styles = variantStyles[variant]
  const isPositive = change > 0
  const isNeutral = change === 0

  if (isLoading) {
    return (
      <Card className="overflow-hidden">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-10 rounded-xl" />
          </div>
          <Skeleton className="h-8 w-28 mb-2" />
          <Skeleton className="h-4 w-32" />
        </CardContent>
      </Card>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="overflow-hidden premium-card">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <div className={cn("rounded-xl p-2.5", styles.icon)}>
              <Icon className="h-5 w-5" />
            </div>
          </div>

          <div className="space-y-1">
            <motion.p
              className="text-2xl font-bold tracking-tight"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              {prefix}
              {typeof value === "number" ? value.toLocaleString() : value}
              {suffix}
            </motion.p>

            <div className="flex items-center gap-1.5">
              {isNeutral ? (
                <Minus className="h-3.5 w-3.5 text-muted-foreground" />
              ) : isPositive ? (
                <TrendingUp className="h-3.5 w-3.5 text-green-500" />
              ) : (
                <TrendingDown className="h-3.5 w-3.5 text-red-500" />
              )}
              <span
                className={cn(
                  "text-xs font-semibold",
                  isNeutral
                    ? "text-muted-foreground"
                    : isPositive
                    ? "text-green-500"
                    : "text-red-500"
                )}
              >
                {isPositive ? "+" : ""}
                {change.toFixed(1)}%
              </span>
              <span className="text-xs text-muted-foreground">{changeLabel}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
