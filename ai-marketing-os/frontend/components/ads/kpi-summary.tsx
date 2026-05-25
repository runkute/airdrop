"use client"

import { TrendingUp, TrendingDown, DollarSign, MousePointer, Eye, Target, BarChart2, Zap } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

interface KpiMetric {
  label: string
  value: string
  change: number
  icon: React.ElementType
  prefix?: string
  suffix?: string
  description?: string
}

interface AdsKpiSummaryProps {
  totalSpend: number
  totalImpressions: number
  totalClicks: number
  avgCtr: number
  avgCpc: number
  avgCpm: number
  avgRoas: number
  totalConversions: number
  isLoading?: boolean
  comparePeriodLabel?: string
}

export function AdsKpiSummary({
  totalSpend,
  totalImpressions,
  totalClicks,
  avgCtr,
  avgCpc,
  avgCpm,
  avgRoas,
  totalConversions,
  isLoading = false,
  comparePeriodLabel = "vs last period",
}: AdsKpiSummaryProps) {
  const metrics: KpiMetric[] = [
    {
      label: "Total Spend",
      value: totalSpend.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      change: 0,
      icon: DollarSign,
      prefix: "$",
      description: "Total ad spend across all platforms",
    },
    {
      label: "Impressions",
      value: totalImpressions >= 1000000
        ? `${(totalImpressions / 1000000).toFixed(1)}M`
        : totalImpressions >= 1000
        ? `${(totalImpressions / 1000).toFixed(1)}K`
        : totalImpressions.toString(),
      change: 0,
      icon: Eye,
      description: "Total ad impressions delivered",
    },
    {
      label: "Clicks",
      value: totalClicks >= 1000
        ? `${(totalClicks / 1000).toFixed(1)}K`
        : totalClicks.toString(),
      change: 0,
      icon: MousePointer,
      description: "Total link clicks",
    },
    {
      label: "Avg CTR",
      value: avgCtr.toFixed(2),
      change: 0,
      icon: Target,
      suffix: "%",
      description: "Average click-through rate",
    },
    {
      label: "Avg CPC",
      value: avgCpc.toFixed(2),
      change: 0,
      icon: BarChart2,
      prefix: "$",
      description: "Average cost per click",
    },
    {
      label: "Avg CPM",
      value: avgCpm.toFixed(2),
      change: 0,
      icon: Zap,
      prefix: "$",
      description: "Average cost per 1,000 impressions",
    },
    {
      label: "ROAS",
      value: avgRoas.toFixed(2),
      change: 0,
      icon: TrendingUp,
      suffix: "x",
      description: "Return on ad spend",
    },
    {
      label: "Conversions",
      value: totalConversions >= 1000
        ? `${(totalConversions / 1000).toFixed(1)}K`
        : totalConversions.toString(),
      change: 0,
      icon: Target,
      description: "Total conversions attributed",
    },
  ]

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-4 w-16 mb-2" />
              <Skeleton className="h-7 w-20 mb-1" />
              <Skeleton className="h-3 w-12" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
      {metrics.map((metric) => {
        const Icon = metric.icon
        return (
          <Card key={metric.label} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center gap-1.5 mb-2">
                <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground truncate">{metric.label}</span>
              </div>
              <div className="text-xl font-bold tracking-tight">
                {metric.prefix}{metric.value}{metric.suffix}
              </div>
              {metric.change !== 0 && (
                <div className={cn(
                  "flex items-center gap-0.5 text-xs mt-1",
                  metric.change > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"
                )}>
                  {metric.change > 0
                    ? <TrendingUp className="h-3 w-3" />
                    : <TrendingDown className="h-3 w-3" />
                  }
                  <span>{Math.abs(metric.change)}%</span>
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
