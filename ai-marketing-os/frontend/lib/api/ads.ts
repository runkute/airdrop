import { apiClient } from "./client"
import type {
  AdAccount,
  Campaign,
  CampaignMetrics,
  ConnectAdAccountRequest,
  AdsDashboardData,
  AdPlatform,
} from "@/lib/types"

export interface AdsFilters {
  platform?: AdPlatform
  start_date?: string
  end_date?: string
  status?: string
}

export const adsApi = {
  getDashboard: (workspaceId: string, filters?: AdsFilters) =>
    apiClient.get<AdsDashboardData>(
      `/workspaces/${workspaceId}/ads/dashboard`,
      { params: filters }
    ),

  getAccounts: (workspaceId: string) =>
    apiClient.get<AdAccount[]>(`/workspaces/${workspaceId}/ad-accounts`),

  connectAccount: (workspaceId: string, data: ConnectAdAccountRequest) =>
    apiClient.post<AdAccount>(
      `/workspaces/${workspaceId}/ad-accounts`,
      data
    ),

  disconnectAccount: (workspaceId: string, accountId: string) =>
    apiClient.delete(
      `/workspaces/${workspaceId}/ad-accounts/${accountId}`
    ),

  syncAccount: (workspaceId: string, accountId: string) =>
    apiClient.post(
      `/workspaces/${workspaceId}/ad-accounts/${accountId}/sync`
    ),

  syncAll: (workspaceId: string) =>
    apiClient.post(`/workspaces/${workspaceId}/ads/sync`),

  getCampaigns: (workspaceId: string, filters?: AdsFilters) =>
    apiClient.get<Campaign[]>(`/workspaces/${workspaceId}/campaigns`, {
      params: filters,
    }),

  getCampaignMetrics: (
    workspaceId: string,
    campaignId: string,
    filters?: { start_date?: string; end_date?: string }
  ) =>
    apiClient.get<CampaignMetrics[]>(
      `/workspaces/${workspaceId}/campaigns/${campaignId}/metrics`,
      { params: filters }
    ),
}
