"use client"

import { format, parseISO, isToday, isTomorrow } from "date-fns"
import { Clock, Facebook, Instagram, Globe, CheckCircle2, XCircle, Loader2, AlertTriangle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import type { ContentPost } from "@/lib/types"

const platformIcons: Record<string, React.ElementType> = {
  facebook: Facebook,
  instagram: Instagram,
  wordpress: Globe,
  twitter: Globe,
  linkedin: Globe,
  tiktok: Globe,
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  scheduled: {
    label: "Scheduled",
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    icon: Clock,
  },
  published: {
    label: "Published",
    color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    icon: CheckCircle2,
  },
  failed: {
    label: "Failed",
    color: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
    icon: XCircle,
  },
  draft: {
    label: "Draft",
    color: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
    icon: AlertTriangle,
  },
  review: {
    label: "In Review",
    color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    icon: Loader2,
  },
}

function formatScheduleTime(dateStr: string): string {
  const date = parseISO(dateStr)
  if (isToday(date)) return `Today at ${format(date, "h:mm a")}`
  if (isTomorrow(date)) return `Tomorrow at ${format(date, "h:mm a")}`
  return format(date, "MMM d 'at' h:mm a")
}

interface PostQueueProps {
  posts: ContentPost[]
  isLoading?: boolean
  onPublishNow?: (postId: string) => void
  onRetry?: (postId: string) => void
  maxHeight?: number
}

export function PostQueue({
  posts,
  isLoading = false,
  onPublishNow,
  onRetry,
  maxHeight = 480,
}: PostQueueProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex gap-3 p-3 rounded-lg border">
            <Skeleton className="h-9 w-9 rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <Clock className="h-8 w-8 text-muted-foreground/40 mb-3" />
        <p className="text-sm text-muted-foreground">No posts in queue</p>
        <p className="text-xs text-muted-foreground/70 mt-1">Schedule content to see it here</p>
      </div>
    )
  }

  return (
    <ScrollArea style={{ maxHeight }}>
      <div className="space-y-2 pr-2">
        {posts.map((post) => {
          const PlatformIcon = platformIcons[post.platform] ?? Globe
          const status = statusConfig[post.status] ?? statusConfig.draft
          const StatusIcon = status.icon

          return (
            <div
              key={post.id}
              className="group flex gap-3 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
            >
              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <PlatformIcon className="h-4 w-4 text-primary" />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{post.title}</p>
                <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{post.content}</p>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <Badge className={cn("text-xs py-0 border-0", status.color)}>
                    <StatusIcon className="h-3 w-3 mr-1" />
                    {status.label}
                  </Badge>
                  {post.scheduled_at && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatScheduleTime(post.scheduled_at)}
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground capitalize">{post.platform}</span>
                </div>
              </div>

              <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                {post.status === "scheduled" && onPublishNow && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => onPublishNow(post.id)}
                  >
                    Publish Now
                  </Button>
                )}
                {post.status === "failed" && onRetry && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs text-red-500 border-red-200 hover:bg-red-50"
                    onClick={() => onRetry(post.id)}
                  >
                    Retry
                  </Button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </ScrollArea>
  )
}
