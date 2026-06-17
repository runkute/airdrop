import { apiClient } from "./client"
import type { AIAlert, PaginatedResponse } from "@/lib/types"

export interface AlertFilters {
  is_read?: boolean
  severity?: string
  page?: number
  size?: number
}

export const alertsApi = {
  getAlerts: (workspaceId: string, filters?: AlertFilters) =>
    apiClient.get<PaginatedResponse<AIAlert>>(
      `/workspaces/${workspaceId}/alerts`,
      { params: filters }
    ),

  getAlert: (workspaceId: string, alertId: string) =>
    apiClient.get<AIAlert>(`/workspaces/${workspaceId}/alerts/${alertId}`),

  markAsRead: (workspaceId: string, alertId: string) =>
    apiClient.post<AIAlert>(
      `/workspaces/${workspaceId}/alerts/${alertId}/read`
    ),

  markAllAsRead: (workspaceId: string) =>
    apiClient.post(`/workspaces/${workspaceId}/alerts/read-all`),

  deleteAlert: (workspaceId: string, alertId: string) =>
    apiClient.delete(`/workspaces/${workspaceId}/alerts/${alertId}`),

  getUnreadCount: (workspaceId: string) =>
    apiClient.get<{ count: number }>(
      `/workspaces/${workspaceId}/alerts/unread-count`
    ),

  getDashboardData: (workspaceId: string) =>
    apiClient.get(`/workspaces/${workspaceId}/dashboard`),
}
