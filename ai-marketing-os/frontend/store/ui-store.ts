import { create } from "zustand"
import { persist } from "zustand/middleware"

export interface Toast {
  id: string
  title: string
  description?: string
  variant?: "default" | "destructive" | "success"
  duration?: number
}

interface UIState {
  sidebarCollapsed: boolean
  isMobileMenuOpen: boolean
  theme: "light" | "dark" | "system"
  notifications: Toast[]
  unreadNotificationsCount: number

  setSidebarCollapsed: (collapsed: boolean) => void
  toggleSidebar: () => void
  setMobileMenuOpen: (open: boolean) => void
  setTheme: (theme: "light" | "dark" | "system") => void
  addNotification: (toast: Omit<Toast, "id">) => void
  removeNotification: (id: string) => void
  clearNotifications: () => void
  setUnreadCount: (count: number) => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      isMobileMenuOpen: false,
      theme: "system",
      notifications: [],
      unreadNotificationsCount: 0,

      setSidebarCollapsed: (collapsed) =>
        set({ sidebarCollapsed: collapsed }),

      toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

      setMobileMenuOpen: (open) => set({ isMobileMenuOpen: open }),

      setTheme: (theme) => set({ theme }),

      addNotification: (toast) => {
        const id = Math.random().toString(36).slice(2)
        set((state) => ({
          notifications: [...state.notifications, { ...toast, id }],
        }))
        const duration = toast.duration ?? 5000
        setTimeout(() => {
          set((state) => ({
            notifications: state.notifications.filter((n) => n.id !== id),
          }))
        }, duration)
        return id
      },

      removeNotification: (id) =>
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        })),

      clearNotifications: () => set({ notifications: [] }),

      setUnreadCount: (count) => set({ unreadNotificationsCount: count }),
    }),
    {
      name: "ui-store",
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        theme: state.theme,
      }),
    }
  )
)
