"use client"

import { useState, useMemo } from "react"
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addDays, addMonths, subMonths, isSameMonth, isSameDay, isToday, parseISO,
} from "date-fns"
import { ChevronLeft, ChevronRight, Facebook, Instagram, Globe } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { ContentPost } from "@/lib/types"

const platformColors: Record<string, string> = {
  facebook: "bg-blue-500",
  instagram: "bg-pink-500",
  wordpress: "bg-orange-500",
  twitter: "bg-sky-500",
  linkedin: "bg-blue-700",
  tiktok: "bg-black dark:bg-white",
}

const platformIconComponents: Record<string, React.ElementType> = {
  facebook: Facebook,
  instagram: Instagram,
  wordpress: Globe,
  twitter: Globe,
  linkedin: Globe,
  tiktok: Globe,
}

interface CalendarViewProps {
  posts: ContentPost[]
  onSelectPost?: (post: ContentPost) => void
  onSelectDate?: (date: Date) => void
}

export function CalendarView({ posts, onSelectPost, onSelectDate }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  const postsByDate = useMemo(() => {
    const map = new Map<string, ContentPost[]>()
    posts.forEach((post) => {
      const dateKey = post.scheduled_at
        ? format(parseISO(post.scheduled_at), "yyyy-MM-dd")
        : post.published_at
        ? format(parseISO(post.published_at), "yyyy-MM-dd")
        : null
      if (dateKey) {
        const existing = map.get(dateKey) ?? []
        map.set(dateKey, [...existing, post])
      }
    })
    return map
  }, [posts])

  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentDate))
    const end = endOfWeek(endOfMonth(currentDate))
    const days: Date[] = []
    let day = start
    while (day <= end) {
      days.push(day)
      day = addDays(day, 1)
    }
    return days
  }, [currentDate])

  const selectedDatePosts = selectedDate
    ? (postsByDate.get(format(selectedDate, "yyyy-MM-dd")) ?? [])
    : []

  function handleDayClick(day: Date) {
    setSelectedDate(day)
    onSelectDate?.(day)
  }

  return (
    <div className="flex gap-4">
      {/* Calendar grid */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">{format(currentDate, "MMMM yyyy")}</h2>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentDate(subMonths(currentDate, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" className="h-8" onClick={() => setCurrentDate(new Date())}>
              Today
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentDate(addMonths(currentDate, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Day names */}
        <div className="grid grid-cols-7 mb-1">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1.5">
              {d}
            </div>
          ))}
        </div>

        {/* Days */}
        <div className="grid grid-cols-7 border-l border-t">
          {calendarDays.map((day) => {
            const key = format(day, "yyyy-MM-dd")
            const dayPosts = postsByDate.get(key) ?? []
            const isCurrentMonth = isSameMonth(day, currentDate)
            const isSelected = selectedDate ? isSameDay(day, selectedDate) : false
            const isTodayDay = isToday(day)

            return (
              <div
                key={key}
                className={cn(
                  "border-r border-b min-h-[88px] p-1.5 cursor-pointer transition-colors",
                  !isCurrentMonth && "bg-muted/20",
                  isSelected && "bg-primary/5 ring-1 ring-inset ring-primary/30",
                  !isSelected && "hover:bg-muted/40",
                )}
                onClick={() => handleDayClick(day)}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={cn(
                    "text-xs font-medium h-5 w-5 flex items-center justify-center rounded-full",
                    !isCurrentMonth && "text-muted-foreground/50",
                    isTodayDay && "bg-primary text-primary-foreground",
                    !isTodayDay && isCurrentMonth && "text-foreground",
                  )}>
                    {format(day, "d")}
                  </span>
                  {dayPosts.length > 2 && (
                    <span className="text-xs text-muted-foreground">+{dayPosts.length - 2}</span>
                  )}
                </div>

                <div className="space-y-0.5">
                  {dayPosts.slice(0, 2).map((post) => {
                    const color = platformColors[post.platform] ?? "bg-gray-400"
                    return (
                      <div
                        key={post.id}
                        className={cn(
                          "flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium text-white truncate",
                          color,
                          post.status === "failed" && "opacity-60 line-through",
                        )}
                        onClick={(e) => { e.stopPropagation(); onSelectPost?.(post) }}
                        title={post.title}
                      >
                        <span className="truncate">{post.title}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Selected day panel */}
      {selectedDate && (
        <div className="w-64 shrink-0 border rounded-lg p-4">
          <h3 className="font-semibold text-sm mb-3">
            {isToday(selectedDate) ? "Today" : format(selectedDate, "MMMM d, yyyy")}
          </h3>

          {selectedDatePosts.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">
              No posts scheduled for this day
            </p>
          ) : (
            <div className="space-y-2">
              {selectedDatePosts.map((post) => {
                const PlatformIcon = platformIconComponents[post.platform] ?? Globe
                return (
                  <div
                    key={post.id}
                    className="p-2.5 rounded-lg border hover:bg-muted/40 cursor-pointer transition-colors"
                    onClick={() => onSelectPost?.(post)}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <PlatformIcon className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs font-medium capitalize">{post.platform}</span>
                      <Badge
                        className={cn(
                          "ml-auto text-[10px] py-0 border-0",
                          post.status === "published" && "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
                          post.status === "scheduled" && "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
                          post.status === "failed" && "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
                        )}
                      >
                        {post.status}
                      </Badge>
                    </div>
                    <p className="text-xs font-medium truncate">{post.title}</p>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{post.content}</p>
                    {post.scheduled_at && (
                      <p className="text-[10px] text-muted-foreground mt-1.5">
                        {format(parseISO(post.scheduled_at), "h:mm a")}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
