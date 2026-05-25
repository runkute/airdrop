"use client"

import { motion } from "framer-motion"
import {
  AlertTriangle,
  DollarSign,
  TrendingDown,
  Pause,
  XCircle,
  AlertCircle,
  Bell,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ScrollArea } from "@/components/ui/scroll-area"
import { formatTimeAgo, getAlertSeverityColor } from "@/lib/utils"
import type { AIAlert } from "@/lib/types"
import { AlertType } from "@/lib/types"

const alertTypeIcons: Record<string, { icon: typeof AlertTriangle; label: string }> = {
  [AlertType.BUDGET_EXCEEDED]: { icon: DollarSign, label: "Budget" },
  [AlertType.LOW_CTR]: { icon: TrendingDown, label: "CTR" },
  [AlertType.HIGH_CPA]: { icon: AlertCircle, label: "CPA" },
  [AlertType.LOW_ROAS]: { icon: TrendingDown, label: "ROAS" },
  [AlertType.CAMPAIGN_PAUSED]: { icon: Pause, label: "Paused" },
  [AlertType.AD_REJECTED]: { icon: XCircle, label: "Rejected" },
  [AlertType.PUBLISH_FAILED]: { icon: AlertTriangle, label: "Publish" },
  [AlertType.INTEGRATION_ERROR]: { icon: AlertCircle, label: "Integration" },
}

interface AlertListProps {
  alerts: AIAlert[]
  isLoading?: boolean
  onMarkRead?: (alertId: string) => void
}

export function AlertList({ alerts, isLoading, onMarkRead }: AlertListProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            AI Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="p-3 border rounded-lg space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  const unreadCount = alerts.filter((a) => !a.is_read).length

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="h-4 w-4 text-primary" />
            AI Alerts
            {unreadCount > 0 && (
              <Badge variant="destructive" className="text-xs px-1.5">
                {unreadCount}
              </Badge>
            )}
          </CardTitle>
          {onMarkRead && unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7"
              onClick={() => alerts.forEach((a) => !a.is_read && onMarkRead(a.id))}
            >
              Mark all read
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <ScrollArea className="h-[320px] pr-4">
          {alerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-center">
              <Bell className="h-8 w-8 text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">No alerts</p>
            </div>
          ) : (
            <div className="space-y-2">
              {alerts.map((alert, index) => {
                const typeConfig = alertTypeIcons[alert.alert_type] ?? {
                  icon: AlertTriangle,
                  label: "Alert",
                }
                const Icon = typeConfig.icon
                return (
                  <motion.div
                    key={alert.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`p-3 rounded-lg border transition-all ${
                      alert.is_read ? "opacity-60" : "hover:shadow-sm"
                    } ${getAlertSeverityColor(alert.severity)}`}
                  >
                    <div className="flex items-start gap-2.5">
                      <Icon className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-semibold leading-tight truncate">
                            {alert.title}
                          </p>
                          <Badge
                            variant="outline"
                            className="text-[10px] px-1 py-0 border-current capitalize flex-shrink-0"
                          >
                            {alert.severity}
                          </Badge>
                        </div>
                        <p className="text-xs leading-relaxed line-clamp-2">
                          {alert.message}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          {alert.campaign_name && (
                            <span className="text-xs opacity-70">
                              {alert.campaign_name}
                            </span>
                          )}
                          <div className="flex items-center gap-2 ml-auto">
                            <span className="text-xs opacity-70">
                              {formatTimeAgo(alert.created_at)}
                            </span>
                            {!alert.is_read && onMarkRead && (
                              <button
                                onClick={() => onMarkRead(alert.id)}
                                className="text-xs underline opacity-70 hover:opacity-100"
                              >
                                Dismiss
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
