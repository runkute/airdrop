"use client"

import { useState, useEffect, useCallback } from "react"
import { CalendarDays, List, CheckCircle2, Clock, XCircle, LayoutList } from "lucide-react"
import { motion } from "framer-motion"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { CalendarView } from "@/components/publishing/calendar-view"
import { PostQueue } from "@/components/publishing/post-queue"
import { useToast } from "@/hooks/use-toast"
import { useAuthStore } from "@/store/auth-store"
import { apiClient } from "@/lib/api/client"
import type { ContentPost } from "@/lib/types"

const fadeIn = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.3 } }

type ViewMode = "calendar" | "list"
type StatusFilter = "all" | "scheduled" | "published" | "failed"

export default function PublishingPage() {
  const { toast } = useToast()
  const { currentWorkspace } = useAuthStore()
  const [posts, setPosts] = useState<ContentPost[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [view, setView] = useState<ViewMode>("calendar")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")

  const loadPosts = useCallback(async () => {
    if (!currentWorkspace) return
    setIsLoading(true)
    try {
      const data = await apiClient.get<{ items: ContentPost[]; total: number }>(
        `/workspaces/${currentWorkspace.id}/publishing?limit=200`
      )
      setPosts(data.items ?? [])
    } catch {
      toast({ title: "Failed to load posts", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }, [currentWorkspace, toast])

  useEffect(() => { loadPosts() }, [loadPosts])

  async function handlePublishNow(postId: string) {
    if (!currentWorkspace) return
    try {
      await apiClient.post(`/workspaces/${currentWorkspace.id}/publishing/${postId}/publish`, {})
      toast({ title: "Published!", description: "Post published successfully." })
      await loadPosts()
    } catch {
      toast({ title: "Publishing failed", description: "Could not publish post.", variant: "destructive" })
    }
  }

  async function handleRetry(postId: string) {
    if (!currentWorkspace) return
    try {
      await apiClient.post(`/workspaces/${currentWorkspace.id}/publishing/${postId}/retry`, {})
      toast({ title: "Retry queued", description: "Post scheduled for retry." })
      await loadPosts()
    } catch {
      toast({ title: "Retry failed", variant: "destructive" })
    }
  }

  const filtered = posts.filter((p) => statusFilter === "all" || p.status === statusFilter)

  const stats = {
    scheduled: posts.filter((p) => p.status === "scheduled").length,
    published: posts.filter((p) => p.status === "published").length,
    failed: posts.filter((p) => p.status === "failed").length,
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div {...fadeIn} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Publishing Calendar</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Schedule and publish content across platforms</p>
        </div>
        <Tabs value={view} onValueChange={(v) => setView(v as ViewMode)}>
          <TabsList className="h-9">
            <TabsTrigger value="calendar" className="gap-2 text-xs">
              <CalendarDays className="h-3.5 w-3.5" />
              Calendar
            </TabsTrigger>
            <TabsTrigger value="list" className="gap-2 text-xs">
              <List className="h-3.5 w-3.5" />
              List
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </motion.div>

      {/* Stats row */}
      <motion.div {...fadeIn} transition={{ delay: 0.05 }} className="grid grid-cols-3 gap-3">
        {[
          { label: "Scheduled", count: stats.scheduled, icon: Clock, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-900/20" },
          { label: "Published", count: stats.published, icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-900/20" },
          { label: "Failed", count: stats.failed, icon: XCircle, color: "text-red-500", bg: "bg-red-50 dark:bg-red-900/20" },
        ].map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.label} className="cursor-pointer hover:shadow-sm transition-shadow" onClick={() => setStatusFilter(stat.label.toLowerCase() as StatusFilter)}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`h-10 w-10 rounded-lg ${stat.bg} flex items-center justify-center`}>
                  <Icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                <div>
                  {isLoading ? <Skeleton className="h-7 w-12" /> : (
                    <div className="text-2xl font-bold">{stat.count}</div>
                  )}
                  <div className="text-xs text-muted-foreground">{stat.label}</div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </motion.div>

      {/* Status filter */}
      <motion.div {...fadeIn} transition={{ delay: 0.1 }} className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Filter:</span>
        {(["all", "scheduled", "published", "failed"] as StatusFilter[]).map((s) => (
          <Badge
            key={s}
            variant={statusFilter === s ? "default" : "outline"}
            className="cursor-pointer capitalize"
            onClick={() => setStatusFilter(s)}
          >
            {s}
          </Badge>
        ))}
      </motion.div>

      {/* Main content */}
      <motion.div {...fadeIn} transition={{ delay: 0.15 }}>
        {view === "calendar" ? (
          <Card>
            <CardContent className="pt-6">
              {isLoading ? (
                <Skeleton className="h-[480px] w-full" />
              ) : (
                <CalendarView
                  posts={filtered}
                  onSelectPost={(post) => {
                    toast({ title: post.title, description: `Status: ${post.status} · ${post.platform}` })
                  }}
                />
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <LayoutList className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-base">
                  {filtered.length} post{filtered.length !== 1 ? "s" : ""}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <PostQueue
                posts={filtered}
                isLoading={isLoading}
                onPublishNow={handlePublishNow}
                onRetry={handleRetry}
                maxHeight={600}
              />
            </CardContent>
          </Card>
        )}
      </motion.div>
    </div>
  )
}
