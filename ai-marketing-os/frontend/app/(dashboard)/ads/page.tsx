"use client"

import { useState, useEffect, useCallback } from "react"
import { RefreshCw, Plus, AlertCircle, BarChart2 } from "lucide-react"
import { motion } from "framer-motion"
import { subDays, format } from "date-fns"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/use-toast"
import { AdsKpiSummary } from "@/components/ads/kpi-summary"
import { MetricsChart } from "@/components/ads/metrics-chart"
import { CampaignTable } from "@/components/ads/campaign-table"
import { useAdsStore } from "@/store/ads-store"
import { useAuthStore } from "@/store/auth-store"

const fadeIn = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.3 } }

type Platform = "all" | "meta" | "google" | "tiktok"

export default function AdsDashboardPage() {
  const { toast } = useToast()
  const { currentWorkspace } = useAuthStore()
  const { dashboardData, adAccounts, campaigns, isLoading, fetchDashboard, syncAds, connectAccount } = useAdsStore()

  const [platform, setPlatform] = useState<Platform>("all")
  const [dateRange, setDateRange] = useState({ from: subDays(new Date(), 29), to: new Date() })
  const [isSyncing, setIsSyncing] = useState(false)
  const [showConnectModal, setShowConnectModal] = useState(false)
  const [connectForm, setConnectForm] = useState({ platform: "meta", account_id: "", account_name: "" })

  const load = useCallback(async () => {
    if (!currentWorkspace) return
    await fetchDashboard(currentWorkspace.id, format(dateRange.from, "yyyy-MM-dd"), format(dateRange.to, "yyyy-MM-dd"))
  }, [currentWorkspace, dateRange, fetchDashboard])

  useEffect(() => { load() }, [load])

  async function handleSync() {
    if (!currentWorkspace) return
    setIsSyncing(true)
    try {
      await syncAds(currentWorkspace.id)
      await load()
      toast({ title: "Sync complete", description: "Ad data refreshed successfully." })
    } catch {
      toast({ title: "Sync failed", description: "Could not sync ad data. Check your connections.", variant: "destructive" })
    } finally {
      setIsSyncing(false)
    }
  }

  async function handleConnect() {
    if (!currentWorkspace) return
    try {
      await connectAccount(currentWorkspace.id, connectForm)
      setShowConnectModal(false)
      setConnectForm({ platform: "meta", account_id: "", account_name: "" })
      toast({ title: "Account connected", description: `${connectForm.account_name} connected successfully.` })
      await load()
    } catch {
      toast({ title: "Connection failed", description: "Could not connect the ad account.", variant: "destructive" })
    }
  }

  const filteredCampaigns = campaigns.filter((c) => platform === "all" || c.platform === platform)

  const summary = dashboardData?.summary ?? {
    total_spend: 0, total_impressions: 0, total_clicks: 0,
    avg_ctr: 0, avg_cpc: 0, avg_cpm: 0, avg_roas: 0, total_conversions: 0,
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <motion.div {...fadeIn} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Ads Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Monitor ad performance across all platforms</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={isSyncing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? "animate-spin" : ""}`} />
            {isSyncing ? "Syncing…" : "Sync Now"}
          </Button>
          <Button size="sm" onClick={() => setShowConnectModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Connect Account
          </Button>
        </div>
      </motion.div>

      {/* KPI summary */}
      <motion.div {...fadeIn} transition={{ delay: 0.05 }}>
        <AdsKpiSummary
          totalSpend={summary.total_spend}
          totalImpressions={summary.total_impressions}
          totalClicks={summary.total_clicks}
          avgCtr={summary.avg_ctr}
          avgCpc={summary.avg_cpc}
          avgCpm={summary.avg_cpm}
          avgRoas={summary.avg_roas}
          totalConversions={summary.total_conversions}
          isLoading={isLoading}
        />
      </motion.div>

      {/* Connected accounts */}
      {adAccounts.length === 0 && !isLoading && (
        <motion.div {...fadeIn} transition={{ delay: 0.1 }}>
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <BarChart2 className="h-10 w-10 text-muted-foreground/30 mb-4" />
              <h3 className="font-semibold mb-1">No ad accounts connected</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Connect your Meta, Google, or TikTok ad accounts to start monitoring performance.
              </p>
              <Button onClick={() => setShowConnectModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Connect First Account
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Performance chart */}
      {(adAccounts.length > 0 || isLoading) && (
        <motion.div {...fadeIn} transition={{ delay: 0.1 }}>
          <MetricsChart
            data={dashboardData?.metrics_by_date ?? []}
            isLoading={isLoading}
            title="Performance Trend"
            description={`${format(dateRange.from, "MMM d")} – ${format(dateRange.to, "MMM d, yyyy")}`}
          />
        </motion.div>
      )}

      {/* Connected accounts badges */}
      {adAccounts.length > 0 && (
        <motion.div {...fadeIn} transition={{ delay: 0.15 }} className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground">Connected:</span>
          {adAccounts.map((acc) => (
            <Badge key={acc.id} variant="outline" className="capitalize gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block" />
              {acc.account_name} ({acc.platform})
            </Badge>
          ))}
        </motion.div>
      )}

      {/* Campaigns table */}
      <motion.div {...fadeIn} transition={{ delay: 0.2 }}>
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle>Campaigns</CardTitle>
              <Tabs value={platform} onValueChange={(v) => setPlatform(v as Platform)}>
                <TabsList className="h-8">
                  <TabsTrigger value="all" className="text-xs h-7 px-3">All</TabsTrigger>
                  <TabsTrigger value="meta" className="text-xs h-7 px-3">Meta</TabsTrigger>
                  <TabsTrigger value="google" className="text-xs h-7 px-3">Google</TabsTrigger>
                  <TabsTrigger value="tiktok" className="text-xs h-7 px-3">TikTok</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <CampaignTable campaigns={filteredCampaigns} isLoading={isLoading} />
          </CardContent>
        </Card>
      </motion.div>

      {/* Connect Account Modal */}
      <Dialog open={showConnectModal} onOpenChange={setShowConnectModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Connect Ad Account</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Platform</Label>
              <Select
                value={connectForm.platform}
                onValueChange={(v) => setConnectForm((f) => ({ ...f, platform: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="meta">Meta Ads (Facebook / Instagram)</SelectItem>
                  <SelectItem value="google">Google Ads</SelectItem>
                  <SelectItem value="tiktok">TikTok Ads</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Account ID</Label>
              <Input
                placeholder="e.g. act_123456789"
                value={connectForm.account_id}
                onChange={(e) => setConnectForm((f) => ({ ...f, account_id: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Account Name</Label>
              <Input
                placeholder="My Brand Ads"
                value={connectForm.account_name}
                onChange={(e) => setConnectForm((f) => ({ ...f, account_name: e.target.value }))}
              />
            </div>
            <div className="rounded-lg bg-muted/50 p-3 flex gap-2">
              <AlertCircle className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">
                Configure platform API credentials in Settings → Integrations before connecting.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConnectModal(false)}>Cancel</Button>
            <Button
              onClick={handleConnect}
              disabled={!connectForm.account_id || !connectForm.account_name}
            >
              Connect Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
