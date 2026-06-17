import { create } from "zustand"
import { persist } from "zustand/middleware"
import Cookies from "js-cookie"
import { authApi } from "@/lib/api/auth"
import { workspaceApi } from "@/lib/api/workspace"
import type { User, Workspace, RegisterRequest } from "@/lib/types"

interface AuthState {
  user: User | null
  currentWorkspace: Workspace | null
  workspaces: Workspace[]
  isAuthenticated: boolean
  isLoading: boolean

  setUser: (user: User | null) => void
  setCurrentWorkspace: (workspace: Workspace) => void
  setWorkspaces: (workspaces: Workspace[]) => void
  login: (email: string, password: string) => Promise<void>
  register: (data: RegisterRequest) => Promise<void>
  logout: () => Promise<void>
  fetchMe: () => Promise<void>
  fetchWorkspaces: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      currentWorkspace: null,
      workspaces: [],
      isAuthenticated: false,
      isLoading: false,

      setUser: (user) => set({ user, isAuthenticated: !!user }),

      setCurrentWorkspace: (workspace) => {
        set({ currentWorkspace: workspace })
        if (typeof window !== "undefined") {
          localStorage.setItem("current_workspace_id", workspace.id)
        }
      },

      setWorkspaces: (workspaces) => set({ workspaces }),

      login: async (email, password) => {
        set({ isLoading: true })
        try {
          const response = await authApi.login({ email, password })
          Cookies.set("access_token", response.access_token, { expires: 1 })
          Cookies.set("refresh_token", response.refresh_token, { expires: 7 })

          set({
            user: response.user,
            currentWorkspace: response.workspace,
            workspaces: [response.workspace],
            isAuthenticated: true,
          })

          if (typeof window !== "undefined") {
            localStorage.setItem("current_workspace_id", response.workspace.id)
          }

          // Fetch all workspaces
          try {
            const workspaces = await workspaceApi.getAll()
            set({ workspaces })
          } catch {
            // non-critical
          }
        } finally {
          set({ isLoading: false })
        }
      },

      register: async (data) => {
        set({ isLoading: true })
        try {
          const response = await authApi.register(data)
          Cookies.set("access_token", response.access_token, { expires: 1 })
          Cookies.set("refresh_token", response.refresh_token, { expires: 7 })

          set({
            user: response.user,
            currentWorkspace: response.workspace,
            workspaces: [response.workspace],
            isAuthenticated: true,
          })

          if (typeof window !== "undefined") {
            localStorage.setItem("current_workspace_id", response.workspace.id)
          }
        } finally {
          set({ isLoading: false })
        }
      },

      logout: async () => {
        const refreshToken = Cookies.get("refresh_token")
        try {
          if (refreshToken) {
            await authApi.logout(refreshToken)
          }
        } catch {
          // continue logout even if API fails
        }
        Cookies.remove("access_token")
        Cookies.remove("refresh_token")
        if (typeof window !== "undefined") {
          localStorage.removeItem("current_workspace_id")
        }
        set({
          user: null,
          currentWorkspace: null,
          workspaces: [],
          isAuthenticated: false,
        })
      },

      fetchMe: async () => {
        set({ isLoading: true })
        try {
          const user = await authApi.getMe()
          set({ user, isAuthenticated: true })
        } catch {
          set({ user: null, isAuthenticated: false })
        } finally {
          set({ isLoading: false })
        }
      },

      fetchWorkspaces: async () => {
        try {
          const workspaces = await workspaceApi.getAll()
          set({ workspaces })
          const state = get()
          if (!state.currentWorkspace && workspaces.length > 0) {
            const savedId =
              typeof window !== "undefined"
                ? localStorage.getItem("current_workspace_id")
                : null
            const workspace =
              workspaces.find((w) => w.id === savedId) ?? workspaces[0]
            set({ currentWorkspace: workspace })
            if (typeof window !== "undefined") {
              localStorage.setItem("current_workspace_id", workspace.id)
            }
          }
        } catch {
          // non-critical
        }
      },
    }),
    {
      name: "auth-store",
      partialize: (state) => ({
        user: state.user,
        currentWorkspace: state.currentWorkspace,
        workspaces: state.workspaces,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
