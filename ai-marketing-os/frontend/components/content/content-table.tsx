"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import {
  MoreHorizontal,
  Calendar,
  Send,
  Trash2,
  Edit,
  ChevronLeft,
  ChevronRight,
  Filter,
} from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { formatDate, getStatusColor, truncateText } from "@/lib/utils"
import type { ContentPost } from "@/lib/types"
import { PostStatus, ContentType, Platform } from "@/lib/types"

interface ContentTableProps {
  posts: ContentPost[]
  isLoading: boolean
  pagination?: { total: number; page: number; pages: number } | null
  onPageChange?: (page: number) => void
  onEdit?: (post: ContentPost) => void
  onSchedule?: (post: ContentPost) => void
  onDelete?: (postId: string) => void
  onPublish?: (postId: string) => void
  onFilterChange?: (filters: ContentFilters) => void
}

export interface ContentFilters {
  status?: PostStatus | ""
  content_type?: ContentType | ""
  platform?: Platform | ""
}

const statusOptions = [
  { value: "", label: "All statuses" },
  { value: PostStatus.DRAFT, label: "Draft" },
  { value: PostStatus.SCHEDULED, label: "Scheduled" },
  { value: PostStatus.PUBLISHED, label: "Published" },
  { value: PostStatus.FAILED, label: "Failed" },
]

const typeOptions = [
  { value: "", label: "All types" },
  { value: ContentType.SOCIAL_POST, label: "Social Post" },
  { value: ContentType.SEO_ARTICLE, label: "SEO Article" },
  { value: ContentType.AD_COPY, label: "Ad Copy" },
  { value: ContentType.EMAIL, label: "Email" },
  { value: ContentType.REEL_SCRIPT, label: "Reel Script" },
]

export function ContentTable({
  posts,
  isLoading,
  pagination,
  onPageChange,
  onEdit,
  onSchedule,
  onDelete,
  onPublish,
  onFilterChange,
}: ContentTableProps) {
  const [filters, setFilters] = useState<ContentFilters>({})

  const updateFilter = (key: keyof ContentFilters, value: string) => {
    const newFilters = { ...filters, [key]: value as never }
    setFilters(newFilters)
    onFilterChange?.(newFilters)
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select
          value={filters.status ?? ""}
          onValueChange={(v) => updateFilter("status", v)}
        >
          <SelectTrigger className="h-8 w-40 text-xs">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.content_type ?? ""}
          onValueChange={(v) => updateFilter("content_type", v)}
        >
          <SelectTrigger className="h-8 w-44 text-xs">
            <SelectValue placeholder="Content type" />
          </SelectTrigger>
          <SelectContent>
            {typeOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-xl border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="pl-4">Content</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Platform</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>AI Provider</TableHead>
              <TableHead>Scheduled / Published</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {posts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                  No content posts found
                </TableCell>
              </TableRow>
            ) : (
              posts.map((post, index) => (
                <motion.tr
                  key={post.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.03 }}
                  className="border-b hover:bg-muted/20 transition-colors"
                >
                  <TableCell className="pl-4 max-w-xs">
                    <p className="text-sm font-medium truncate">
                      {post.title ?? truncateText(post.content, 60)}
                    </p>
                    {post.ai_provider && (
                      <p className="text-xs text-muted-foreground">
                        {post.ai_model}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs capitalize">
                      {post.content_type.replace(/_/g, " ")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm capitalize">
                      {post.platform}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(post.status)}`}
                    >
                      {post.status}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm capitalize text-muted-foreground">
                      {post.ai_provider ?? "—"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-muted-foreground">
                      {post.scheduled_at
                        ? formatDate(post.scheduled_at, "MMM d, h:mm a")
                        : post.published_at
                        ? formatDate(post.published_at, "MMM d, h:mm a")
                        : "—"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {onEdit && (
                          <DropdownMenuItem onClick={() => onEdit(post)}>
                            <Edit className="h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                        )}
                        {onSchedule && post.status === PostStatus.DRAFT && (
                          <DropdownMenuItem onClick={() => onSchedule(post)}>
                            <Calendar className="h-4 w-4" />
                            Schedule
                          </DropdownMenuItem>
                        )}
                        {onPublish && post.status === PostStatus.SCHEDULED && (
                          <DropdownMenuItem onClick={() => onPublish(post.id)}>
                            <Send className="h-4 w-4" />
                            Publish Now
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        {onDelete && (
                          <DropdownMenuItem
                            onClick={() => onDelete(post.id)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </motion.tr>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {pagination.total} posts total · Page {pagination.page} of{" "}
            {pagination.pages}
          </span>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="icon-sm"
              disabled={pagination.page <= 1}
              onClick={() => onPageChange?.(pagination.page - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              disabled={pagination.page >= pagination.pages}
              onClick={() => onPageChange?.(pagination.page + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
