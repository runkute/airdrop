import { apiClient } from "./client"
import type {
  Workspace,
  WorkspaceMembership,
  InviteMemberRequest,
  UpdateMemberRoleRequest,
  AIProviderConfig,
  Integration,
} from "@/lib/types"

export const workspaceApi = {
  getAll: () => apiClient.get<Workspace[]>("/workspaces"),

  getById: (workspaceId: string) =>
    apiClient.get<Workspace>(`/workspaces/${workspaceId}`),

  create: (data: { name: string; slug?: string }) =>
    apiClient.post<Workspace>("/workspaces", data),

  update: (workspaceId: string, data: Partial<Workspace>) =>
    apiClient.patch<Workspace>(`/workspaces/${workspaceId}`, data),

  delete: (workspaceId: string) =>
    apiClient.delete(`/workspaces/${workspaceId}`),

  getMembers: (workspaceId: string) =>
    apiClient.get<WorkspaceMembership[]>(
      `/workspaces/${workspaceId}/members`
    ),

  inviteMember: (workspaceId: string, data: InviteMemberRequest) =>
    apiClient.post<WorkspaceMembership>(
      `/workspaces/${workspaceId}/members/invite`,
      data
    ),

  updateMemberRole: (
    workspaceId: string,
    userId: string,
    data: UpdateMemberRoleRequest
  ) =>
    apiClient.patch<WorkspaceMembership>(
      `/workspaces/${workspaceId}/members/${userId}`,
      data
    ),

  removeMember: (workspaceId: string, userId: string) =>
    apiClient.delete(`/workspaces/${workspaceId}/members/${userId}`),

  getIntegrations: (workspaceId: string) =>
    apiClient.get<Integration[]>(
      `/workspaces/${workspaceId}/integrations`
    ),

  connectIntegration: (workspaceId: string, platform: string, data: Record<string, string>) =>
    apiClient.post<Integration>(
      `/workspaces/${workspaceId}/integrations/${platform}/connect`,
      data
    ),

  disconnectIntegration: (workspaceId: string, platform: string) =>
    apiClient.delete(
      `/workspaces/${workspaceId}/integrations/${platform}`
    ),

  getAIProviders: (workspaceId: string) =>
    apiClient.get<AIProviderConfig[]>(
      `/workspaces/${workspaceId}/ai-providers`
    ),

  updateAIProvider: (
    workspaceId: string,
    provider: string,
    data: { api_key: string; model_preference?: string }
  ) =>
    apiClient.put<AIProviderConfig>(
      `/workspaces/${workspaceId}/ai-providers/${provider}`,
      data
    ),

  testAIProvider: (workspaceId: string, provider: string) =>
    apiClient.post<{ success: boolean; message: string }>(
      `/workspaces/${workspaceId}/ai-providers/${provider}/test`
    ),
}
