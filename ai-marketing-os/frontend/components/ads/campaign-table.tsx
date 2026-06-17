"use client"

import { useState } from "react"
import { ArrowUpDown, ArrowUp, ArrowDown, ExternalLink } from "lucide-react"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import type { Campaign, CampaignMetrics } from "@/lib/types"

interface CampaignRow extends Campaign {
  metrics?: CampaignMetrics
}

interface CampaignTableProps {
  campaigns: CampaignRow[]
  isLoading?: boolean
}

type SortKey = "name" | "spend" | "ctr" | "cpc" | "roas" | "conversions"
type SortDir = "asc" | "desc"

const platformColors: Record<string, string> = {
  meta: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  google: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  tiktok: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
}

const statusColors: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  paused: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  deleted: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
  archived: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
}

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (col !== sortKey) return <ArrowUpDown className="ml-1.5 h-3.5 w-3.5 opacity-40" />
  return sortDir === "asc"
    ? <ArrowUp className="ml-1.5 h-3.5 w-3.5 text-primary" />
    : <ArrowDown className="ml-1.5 h-3.5 w-3.5 text-primary" />
}

export function CampaignTable({ campaigns, isLoading = false }: CampaignTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("spend")
  const [sortDir, setSortDir] = useState<SortDir>("desc")

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    else { setSortKey(key); setSortDir("desc") }
  }

  const sorted = [...campaigns].sort((a, b) => {
    let av = 0, bv = 0
    if (sortKey === "name") {
      return sortDir === "asc"
        ? a.name.localeCompare(b.name)
        : b.name.localeCompare(a.name)
    }
    if (sortKey === "spend") { av = a.metrics?.spend ?? 0; bv = b.metrics?.spend ?? 0 }
    if (sortKey === "ctr") { av = a.metrics?.ctr ?? 0; bv = b.metrics?.ctr ?? 0 }
    if (sortKey === "cpc") { av = a.metrics?.cpc ?? 0; bv = b.metrics?.cpc ?? 0 }
    if (sortKey === "roas") { av = a.metrics?.roas ?? 0; bv = b.metrics?.roas ?? 0 }
    if (sortKey === "conversions") { av = a.metrics?.conversions ?? 0; bv = b.metrics?.conversions ?? 0 }
    return sortDir === "asc" ? av - bv : bv - av
  })

  if (isLoading) {
    return (
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              {["Campaign", "Platform", "Status", "Spend", "CTR", "CPC", "ROAS", "Conv."].map((h) => (
                <TableHead key={h}><Skeleton className="h-4 w-16" /></TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                {Array.from({ length: 8 }).map((_, j) => (
                  <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    )
  }

  if (campaigns.length === 0) {
    return (
      <div className="rounded-lg border flex flex-col items-center justify-center py-16 text-center">
        <p className="text-muted-foreground text-sm">No campaigns found.</p>
        <p className="text-muted-foreground text-xs mt-1">Connect an ad account and sync to see campaigns.</p>
      </div>
    )
  }

  const fmtCurrency = (v?: number) =>
    v != null ? `$${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—"
  const fmtPct = (v?: number) => v != null ? `${v.toFixed(2)}%` : "—"
  const fmtNum = (v?: number) => v != null ? v.toLocaleString() : "—"
  const fmtX = (v?: number) => v != null ? `${v.toFixed(2)}x` : "—"

  return (
    <div className="rounded-lg border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40">
            <TableHead>
              <Button variant="ghost" size="sm" className="-ml-3 h-8" onClick={() => toggleSort("name")}>
                Campaign <SortIcon col="name" sortKey={sortKey} sortDir={sortDir} />
              </Button>
            </TableHead>
            <TableHead>Platform</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">
              <Button variant="ghost" size="sm" className="h-8" onClick={() => toggleSort("spend")}>
                Spend <SortIcon col="spend" sortKey={sortKey} sortDir={sortDir} />
              </Button>
            </TableHead>
            <TableHead className="text-right">
              <Button variant="ghost" size="sm" className="h-8" onClick={() => toggleSort("ctr")}>
                CTR <SortIcon col="ctr" sortKey={sortKey} sortDir={sortDir} />
              </Button>
            </TableHead>
            <TableHead className="text-right">
              <Button variant="ghost" size="sm" className="h-8" onClick={() => toggleSort("cpc")}>
                CPC <SortIcon col="cpc" sortKey={sortKey} sortDir={sortDir} />
              </Button>
            </TableHead>
            <TableHead className="text-right">
              <Button variant="ghost" size="sm" className="h-8" onClick={() => toggleSort("roas")}>
                ROAS <SortIcon col="roas" sortKey={sortKey} sortDir={sortDir} />
              </Button>
            </TableHead>
            <TableHead className="text-right">
              <Button variant="ghost" size="sm" className="h-8" onClick={() => toggleSort("conversions")}>
                Conv. <SortIcon col="conversions" sortKey={sortKey} sortDir={sortDir} />
              </Button>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((campaign) => (
            <TableRow key={campaign.id} className="hover:bg-muted/30">
              <TableCell>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm max-w-[200px] truncate" title={campaign.name}>
                    {campaign.name}
                  </span>
                  <a
                    href="#"
                    className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                    title="View campaign"
                  >
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </TableCell>
              <TableCell>
                <Badge className={cn("text-xs font-medium border-0", platformColors[campaign.platform] ?? "")}>
                  {campaign.platform.charAt(0).toUpperCase() + campaign.platform.slice(1)}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge className={cn("text-xs font-medium border-0", statusColors[campaign.status] ?? "")}>
                  {campaign.status}
                </Badge>
              </TableCell>
              <TableCell className="text-right font-mono text-sm">{fmtCurrency(campaign.metrics?.spend)}</TableCell>
              <TableCell className="text-right font-mono text-sm">{fmtPct(campaign.metrics?.ctr)}</TableCell>
              <TableCell className="text-right font-mono text-sm">{fmtCurrency(campaign.metrics?.cpc)}</TableCell>
              <TableCell className={cn(
                "text-right font-mono text-sm font-medium",
                (campaign.metrics?.roas ?? 0) >= 3
                  ? "text-emerald-600 dark:text-emerald-400"
                  : (campaign.metrics?.roas ?? 0) >= 1
                  ? "text-yellow-600 dark:text-yellow-400"
                  : campaign.metrics?.roas != null
                  ? "text-red-500"
                  : ""
              )}>
                {fmtX(campaign.metrics?.roas)}
              </TableCell>
              <TableCell className="text-right font-mono text-sm">{fmtNum(campaign.metrics?.conversions)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
