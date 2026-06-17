import { apiClient } from "./client"
import type {
  BrandVoice,
  CreateBrandVoiceRequest,
  UpdateBrandVoiceRequest,
} from "@/lib/types"

export const brandVoiceApi = {
  getAll: (workspaceId: string) =>
    apiClient.get<BrandVoice[]>(`/workspaces/${workspaceId}/brand-voices`),

  getById: (workspaceId: string, voiceId: string) =>
    apiClient.get<BrandVoice>(
      `/workspaces/${workspaceId}/brand-voices/${voiceId}`
    ),

  create: (workspaceId: string, data: CreateBrandVoiceRequest) =>
    apiClient.post<BrandVoice>(
      `/workspaces/${workspaceId}/brand-voices`,
      data
    ),

  update: (
    workspaceId: string,
    voiceId: string,
    data: UpdateBrandVoiceRequest
  ) =>
    apiClient.patch<BrandVoice>(
      `/workspaces/${workspaceId}/brand-voices/${voiceId}`,
      data
    ),

  delete: (workspaceId: string, voiceId: string) =>
    apiClient.delete(
      `/workspaces/${workspaceId}/brand-voices/${voiceId}`
    ),

  setDefault: (workspaceId: string, voiceId: string) =>
    apiClient.post<BrandVoice>(
      `/workspaces/${workspaceId}/brand-voices/${voiceId}/set-default`
    ),
}
