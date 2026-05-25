"use client"

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { format, parseISO } from "date-fns"

interface MetricDataPoint {
  date: string
  spend: number
  clicks: number
  impressions: number
  conversions: number
  roas: number
}

interface MetricsChartProps {
  data: MetricDataPoint[]
  isLoading?: boolean
  title?: string
  description?: string
}

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v)

const formatNumber = (v: number) =>
  v >= 1_000_000
    ? `${(v / 1_000_000).toFixed(1)}M`
    : v >= 1_000
    ? `${(v / 1_000).toFixed(0)}K`
    : String(v)

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border bg-background p-3 shadow-md text-sm">
      <p className="font-semibold mb-2">
        {label ? format(parseISO(label), "MMM d, yyyy") : ""}
      </p>
      {payload.map((entry: any) => (
        <div key={entry.dataKey} className="flex items-center justify-between gap-6">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: entry.color }} />
            <span className="text-muted-foreground">{entry.name}</span>
          </span>
          <span className="font-medium">
            {entry.dataKey === "spend"
              ? formatCurrency(entry.value)
              : entry.dataKey === "roas"
              ? `${entry.value.toFixed(2)}x`
              : formatNumber(entry.value)}
          </span>
        </div>
      ))}
    </div>
  )
}

export function MetricsChart({
  data,
  isLoading = false,
  title = "Performance Over Time",
  description = "Ad spend, clicks, and impressions trend",
}: MetricsChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-64 mt-1" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    )
  }

  const formatted = data.map((d) => ({
    ...d,
    label: d.date,
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={formatted} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(262,83%,58%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(262,83%,58%)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="clicksGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(220,70%,50%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(220,70%,50%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="label"
              tickFormatter={(v) => { try { return format(parseISO(v), "MMM d") } catch { return v } }}
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              yAxisId="left"
              tickFormatter={formatCurrency}
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              tickLine={false}
              axisLine={false}
              width={60}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tickFormatter={formatNumber}
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              tickLine={false}
              axisLine={false}
              width={50}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
              iconType="circle"
              iconSize={8}
            />
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="spend"
              name="Spend"
              stroke="hsl(262,83%,58%)"
              strokeWidth={2}
              fill="url(#spendGrad)"
            />
            <Area
              yAxisId="right"
              type="monotone"
              dataKey="clicks"
              name="Clicks"
              stroke="hsl(220,70%,50%)"
              strokeWidth={2}
              fill="url(#clicksGrad)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
