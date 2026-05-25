import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { format, formatDistanceToNow } from "date-fns"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function formatNumber(num: number): string {
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1)}M`
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(1)}K`
  }
  return num.toString()
}

export function formatPercentage(value: number, decimals = 2): string {
  return `${value.toFixed(decimals)}%`
}

export function formatDate(date: string | Date, fmt = "MMM d, yyyy"): string {
  try {
    const d = typeof date === "string" ? new Date(date) : date
    return format(d, fmt)
  } catch {
    return "Invalid date"
  }
}

export function formatTimeAgo(date: string | Date): string {
  try {
    const d = typeof date === "string" ? new Date(date) : date
    return formatDistanceToNow(d, { addSuffix: true })
  } catch {
    return "Unknown"
  }
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength)}...`
}

export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
}

export function calculateROAS(spend: number, revenue: number): number {
  if (spend === 0) return 0
  return revenue / spend
}

export function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    draft: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    scheduled: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    published: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    failed: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    active: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    paused: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    completed: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    pending: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
    read: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
    unread: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  }
  return map[status.toLowerCase()] ?? "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
}

export function getPlatformColor(platform: string): string {
  const map: Record<string, string> = {
    instagram: "#E1306C",
    facebook: "#1877F2",
    twitter: "#1DA1F2",
    x: "#000000",
    linkedin: "#0A66C2",
    tiktok: "#000000",
    youtube: "#FF0000",
    google: "#4285F4",
    pinterest: "#E60023",
  }
  return map[platform.toLowerCase()] ?? "#6366f1"
}

export function getAlertSeverityColor(severity: string): string {
  const map: Record<string, string> = {
    critical: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800",
    high: "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800",
    medium: "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800",
    low: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800",
    info: "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700",
  }
  return map[severity.toLowerCase()] ?? map.info
}

export function getPlatformIcon(platform: string): string {
  const map: Record<string, string> = {
    instagram: "Instagram",
    facebook: "Facebook",
    twitter: "Twitter",
    x: "Twitter",
    linkedin: "Linkedin",
    tiktok: "Music2",
    youtube: "Youtube",
    google: "Globe",
    meta: "Facebook",
  }
  return map[platform.toLowerCase()] ?? "Globe"
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout
  return function (...args: Parameters<T>) {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function parseApiError(error: unknown): string {
  if (error && typeof error === "object") {
    const err = error as { response?: { data?: { detail?: string; message?: string } }; message?: string }
    if (err.response?.data?.detail) return err.response.data.detail
    if (err.response?.data?.message) return err.response.data.message
    if (err.message) return err.message
  }
  return "An unexpected error occurred"
}
