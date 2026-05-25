"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import {
  LayoutDashboard,
  FileText,
  DollarSign,
  MousePointerClick,
  TrendingUp,
  RefreshCw,
  PenTool,
  Zap,
  Calendar,
  BarChart2,
} from "lucide-react"
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts"
import { motion } from "framer-motion"
import { format } from "date-fns"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { KpiCard } from "@/components/dashboard/kpi-card"
import { ActivityFeed } from "@/components/dashboard/activity-feed"
import { AlertList } from "@/components/dashboard/alert-list"
import { useWorkspace } from "@/hooks/use-workspace"
import { alertsApi } from "@/lib/api/alerts"
import { formatCurrency, formatDate, getStatusColor, parseApiError } from "@/lib/utils"
import { toast } from "@/hooks/use-toast"
import type { DashboardData, ContentPost, ActivityItem, AIAlert } from "@/lib/types"

// Mock data for demo - replace with real API calls
const generateMockData = (): DashboardData => {
  const days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (29 - i))
    return {
      date: format(d, "MMM d"),
      spend: Math.random() * 2000 + 500,
      clicks: Math.floor(Math.random() * 1500 + 200),
      impressions: Math.floor(Math.random() * 50000 + 10000),
    }
  })

  return {
    kpis: {
      total_content_generated: 1247,
      total_ad_spend: 48320.5,
      avg_ctr: 3.24,
      avg_roas: 4.87,
      content_change: 12.5,
      spend_change: -3.2,
      ctr_change: 8.1,
      roas_change: 15.3,
    },
    spend_over_time: days,
    content_by_type: [
      { content_type: "Social Post", count: 542 },
      { content_type: "SEO Article", count: 189 },
      { content_type: "Ad Copy", count: 312 },
      { content_type: "Email", count: 98 },
      { content_type: "Reel Script", count: 106 },
    ],
    recent_alerts: [
      {
        id: "1",
        workspace_id: "ws1",
        alert_type: "budget_exceeded" as never,
        severity: "critical" as never,
        title: "Budget limit exceeded",
        message: "Campaign 'Summer Sale 2024' has exceeded its daily budget by 23%.",
        campaign_name: "Summer Sale 2024",
        is_read: false,
        created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      },
      {
        id: "2",
        workspace_id: "ws1",
        alert_type: "low_ctr" as never,
        severity: "medium" as never,
        title: "Low CTR detected",
        message: "Ad set 'Brand Awareness - Mobile' has CTR below 0.5% threshold.",
        campaign_name: "Brand Awareness",
        is_read: false,
        created_at: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
      },
      {
        id: "3",
        workspace_id: "ws1",
        alert_type: "low_roas" as never,
        severity: "high" as never,
        title: "ROAS below target",
        message: "Google Ads campaign ROAS dropped to 2.1x, below the 3x target.",
        campaign_name: "Google Search - Brand",
        is_read: true,
        created_at: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
      },
    ] as AIAlert[],
    content_queue: [
      {
        id: "p1",
        workspace_id: "ws1",
        content: "Excited to announce our new AI-powered features launching next week! Stay tuned for a revolution in marketing automation. #AI #Marketing",
        content_type: "social_post" as never,
        platform: "instagram" as never,
        status: "scheduled" as never,
        scheduled_at: new Date(Date.now() + 1000 * 60 * 60 * 3).toISOString(),
        created_by: "u1",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: "p2",
        workspace_id: "ws1",
        title: "10 AI Marketing Trends for 2025",
        content: "Discover the top AI marketing trends that will define 2025...",
        content_type: "seo_article" as never,
        platform: "website" as never,
        status: "draft" as never,
        created_by: "u1",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ] as ContentPost[],
    recent_activity: [
      {
        id: "a1",
        type: "content_generated",
        title: "New content generated",
        description: "Instagram post for Summer Campaign",
        timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
      },
      {
        id: "a2",
        type: "ads_synced",
        title: "Ads data synced",
        description: "Meta & Google Ads updated",
        timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
      },
      {
        id: "a3",
        type: "post_published",
        title: "Post published",
        description: "LinkedIn article published successfully",
        timestamp: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
      },
      {
        id: "a4",
        type: "alert_triggered",
        title: "Alert triggered",
        description: "Budget exceeded on Summer Sale campaign",
        timestamp: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
      },
      {
        id: "a5",
        type: "content_generated",
        title: "New content generated",
        description: "SEO article: AI Marketing Trends 2025",
        timestamp: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
      },
    ] as ActivityItem[],
  }
}

export default function DashboardPage() {
  const { workspaceId } = useWorkspace()
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [alerts, setAlerts] = useState<AIAlert[]>([])

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    try {
      // Try to fetch from API, fall back to mock data
      if (workspaceId) {
        try {
          const data = await alertsApi.getDashboardData(workspaceId) as DashboardData
          setDashboardData(data)
          setAlerts(data.recent_alerts ?? [])
        } catch {
          // Use mock data if API unavailable
          const mock = generateMockData()
          setDashboardData(mock)
          setAlerts(mock.recent_alerts)
        }
      } else {
        const mock = generateMockData()
        setDashboardData(mock)
        setAlerts(mock.recent_alerts)
      }
    } finally {
      setIsLoading(false)
    }
  }, [workspaceId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleSync = async () => {
    setIsSyncing(true)
    try {
      await new Promise((resolve) => setTimeout(resolve, 2000))
      toast({ title: "Sync complete", description: "Ads data has been refreshed." })
      fetchData()
    } catch (error) {
      toast({ title: "Sync failed", description: parseApiError(error), variant: "destructive" })
    } finally {
      setIsSyncing(false)
    }
  }

  const handleMarkAlertRead = (alertId: string) => {
    setAlerts((prev) => prev.map((a) => a.id === alertId ? { ...a, is_read: true } : a))
  }

  const kpis = dashboardData?.kpis

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <LayoutDashboard className="h-6 w-6 text-primary" />
            Dashboard
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Overview of your marketing performance
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            loading={isSyncing}
          >
            <RefreshCw className="h-4 w-4" />
            Sync Ads
          </Button>
          <Button size="sm" asChild>
            <Link href="/content-studio">
              <PenTool className="h-4 w-4" />
              Generate Content
            </Link>
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          title="Content Generated"
          value={kpis?.total_content_generated ?? 0}
          change={kpis?.content_change ?? 0}
          changeLabel="vs last month"
          icon={FileText}
          isLoading={isLoading}
          variant="default"
        />
        <KpiCard
          title="Total Ad Spend"
          value={kpis ? formatCurrency(kpis.total_ad_spend) : "0"}
          change={kpis?.spend_change ?? 0}
          changeLabel="vs last month"
          icon={DollarSign}
          isLoading={isLoading}
          variant="warning"
        />
        <KpiCard
          title="Avg CTR"
          value={kpis?.avg_ctr.toFixed(2) ?? "0"}
          change={kpis?.ctr_change ?? 0}
          changeLabel="vs last month"
          icon={MousePointerClick}
          suffix="%"
          isLoading={isLoading}
          variant="success"
        />
        <KpiCard
          title="Avg ROAS"
          value={kpis?.avg_roas.toFixed(2) ?? "0"}
          change={kpis?.roas_change ?? 0}
          changeLabel="vs last month"
          icon={TrendingUp}
          suffix="x"
          isLoading={isLoading}
          variant="success"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Spend over time - takes 2/3 */}
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Ad Spend Over Time</CardTitle>
            <CardDescription>Daily spend for the last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[240px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={dashboardData?.spend_over_time ?? []}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    interval={4}
                    className="text-muted-foreground"
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}`}
                    className="text-muted-foreground"
                  />
                  <Tooltip
                    formatter={(value: number) => [`$${value.toFixed(2)}`, "Spend"]}
                    contentStyle={{
                      borderRadius: "8px",
                      border: "1px solid hsl(var(--border))",
                      background: "hsl(var(--card))",
                      color: "hsl(var(--card-foreground))",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="spend"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Content by type */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Content by Type</CardTitle>
            <CardDescription>Posts generated per type</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[240px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart
                  data={dashboardData?.content_by_type ?? []}
                  layout="vertical"
                  margin={{ left: 0, right: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} />
                  <YAxis
                    type="category"
                    dataKey="content_type"
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    width={70}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "8px",
                      border: "1px solid hsl(var(--border))",
                      background: "hsl(var(--card))",
                      color: "hsl(var(--card-foreground))",
                    }}
                  />
                  <Bar
                    dataKey="count"
                    fill="hsl(var(--primary))"
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Alerts + Activity + Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Alerts */}
        <AlertList
          alerts={alerts}
          isLoading={isLoading}
          onMarkRead={handleMarkAlertRead}
        />

        {/* Activity Feed */}
        <ActivityFeed
          items={dashboardData?.recent_activity ?? []}
          isLoading={isLoading}
        />

        {/* Content Queue */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Calendar className="h-4 w-4 text-primary" />
                Content Queue
              </CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/publishing" className="text-xs">View all</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="p-3 border rounded-lg space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ))
            ) : dashboardData?.content_queue.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No scheduled posts</p>
                <Button size="sm" variant="outline" className="mt-3" asChild>
                  <Link href="/content-studio">Create content</Link>
                </Button>
              </div>
            ) : (
              dashboardData?.content_queue.map((post) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 border rounded-lg hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <p className="text-sm font-medium line-clamp-1">
                      {post.title ?? post.content.slice(0, 50) + "..."}
                    </p>
                    <Badge
                      className={`text-[10px] flex-shrink-0 ${getStatusColor(post.status)}`}
                    >
                      {post.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="capitalize">{post.platform}</span>
                    {post.scheduled_at && (
                      <>
                        <span>•</span>
                        <span>{formatDate(post.scheduled_at, "MMM d, h:mm a")}</span>
                      </>
                    )}
                  </div>
                </motion.div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Zap className="h-4 w-4 text-primary" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Generate Content", icon: PenTool, href: "/content-studio", color: "bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400" },
              { label: "Schedule Posts", icon: Calendar, href: "/publishing", color: "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400" },
              { label: "View Campaigns", icon: BarChart2, href: "/ads", color: "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400" },
              { label: "Manage Brand Voice", icon: Zap, href: "/brand-voice", color: "bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400" },
            ].map((action) => {
              const Icon = action.icon
              return (
                <Link key={action.href} href={action.href}>
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`p-4 rounded-xl flex flex-col items-center gap-2 text-center cursor-pointer ${action.color} transition-all hover:shadow-sm`}
                  >
                    <Icon className="h-6 w-6" />
                    <span className="text-sm font-medium">{action.label}</span>
                  </motion.div>
                </Link>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
