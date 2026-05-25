import { apiClient } from "./client"
import type {
  ContentPost,
  GenerateContentRequest,
  GenerateContentResponse,
  PaginatedResponse,
  PostStatus,
  ContentType,
  Platform,
} from "@/lib/types"

export interface ContentFilters {
  status?: PostStatus
  content_type?: ContentType
  platform?: Platform
  page?: number
  size?: number
}

export const contentApi = {
  generateContent: (data: GenerateContentRequest) =>
    apiClient.post<GenerateContentResponse>("/content/generate", data),

  getPosts: (workspaceId: string, filters?: ContentFilters) =>
    apiClient.get<PaginatedResponse<ContentPost>>(
      `/workspaces/${workspaceId}/posts`,
      { params: filters }
    ),

  getPost: (postId: string) =>
    apiClient.get<ContentPost>(`/content/posts/${postId}`),

  createPost: (
    workspaceId: string,
    data: Partial<ContentPost>
  ) =>
    apiClient.post<ContentPost>(`/workspaces/${workspaceId}/posts`, data),

  updatePost: (postId: string, data: Partial<ContentPost>) =>
    apiClient.patch<ContentPost>(`/content/posts/${postId}`, data),

  deletePost: (postId: string) =>
    apiClient.delete(`/content/posts/${postId}`),

  schedulePost: (postId: string, scheduledAt: string) =>
    apiClient.post<ContentPost>(`/content/posts/${postId}/schedule`, {
      scheduled_at: scheduledAt,
    }),

  publishPost: (postId: string) =>
    apiClient.post<ContentPost>(`/content/posts/${postId}/publish`),

  getScheduledPosts: (workspaceId: string, startDate: string, endDate: string) =>
    apiClient.get<ContentPost[]>(`/workspaces/${workspaceId}/posts/scheduled`, {
      params: { start_date: startDate, end_date: endDate },
    }),
}
