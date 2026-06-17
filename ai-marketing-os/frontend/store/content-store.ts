import { create } from "zustand"
import { contentApi } from "@/lib/api/content"
import type {
  ContentPost,
  GenerateContentRequest,
  GenerateContentResponse,
  PaginatedResponse,
} from "@/lib/types"

interface ContentState {
  contentPosts: ContentPost[]
  pagination: { total: number; page: number; pages: number } | null
  isGenerating: boolean
  isLoading: boolean
  generatedContent: GenerateContentResponse | null
  generationError: string | null
  editingContent: string

  setEditingContent: (content: string) => void
  clearGenerated: () => void
  generateContent: (
    data: GenerateContentRequest
  ) => Promise<GenerateContentResponse>
  fetchPosts: (
    workspaceId: string,
    filters?: Parameters<typeof contentApi.getPosts>[1]
  ) => Promise<void>
  updatePost: (postId: string, data: Partial<ContentPost>) => Promise<ContentPost>
  deletePost: (postId: string) => Promise<void>
  schedulePost: (postId: string, scheduledAt: string) => Promise<ContentPost>
  publishPost: (postId: string) => Promise<ContentPost>
}

export const useContentStore = create<ContentState>()((set, get) => ({
  contentPosts: [],
  pagination: null,
  isGenerating: false,
  isLoading: false,
  generatedContent: null,
  generationError: null,
  editingContent: "",

  setEditingContent: (content) => set({ editingContent: content }),

  clearGenerated: () =>
    set({ generatedContent: null, generationError: null, editingContent: "" }),

  generateContent: async (data) => {
    set({ isGenerating: true, generationError: null })
    try {
      const result = await contentApi.generateContent(data)
      set({
        generatedContent: result,
        editingContent: result.content,
        isGenerating: false,
      })
      return result
    } catch (error) {
      const message =
        error && typeof error === "object" && "message" in error
          ? String((error as { message: string }).message)
          : "Generation failed"
      set({ generationError: message, isGenerating: false })
      throw error
    }
  },

  fetchPosts: async (workspaceId, filters) => {
    set({ isLoading: true })
    try {
      const result: PaginatedResponse<ContentPost> = await contentApi.getPosts(
        workspaceId,
        filters
      )
      set({
        contentPosts: result.items,
        pagination: {
          total: result.total,
          page: result.page,
          pages: result.pages,
        },
      })
    } finally {
      set({ isLoading: false })
    }
  },

  updatePost: async (postId, data) => {
    const result = await contentApi.updatePost(postId, data)
    set((state) => ({
      contentPosts: state.contentPosts.map((p) =>
        p.id === postId ? result : p
      ),
    }))
    return result
  },

  deletePost: async (postId) => {
    await contentApi.deletePost(postId)
    set((state) => ({
      contentPosts: state.contentPosts.filter((p) => p.id !== postId),
    }))
  },

  schedulePost: async (postId, scheduledAt) => {
    const result = await contentApi.schedulePost(postId, scheduledAt)
    set((state) => ({
      contentPosts: state.contentPosts.map((p) =>
        p.id === postId ? result : p
      ),
    }))
    return result
  },

  publishPost: async (postId) => {
    const result = await contentApi.publishPost(postId)
    set((state) => ({
      contentPosts: state.contentPosts.map((p) =>
        p.id === postId ? result : p
      ),
    }))
    return result
  },
}))
