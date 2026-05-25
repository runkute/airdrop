import { create } from "zustand"
import { adsApi } from "@/lib/api/ads"
import type {
  AdAccount,
  Campaign,
  AdsDashboardData,
  ConnectAdAccountRequest,
} from "@/lib/types"

interface AdsState {
  adAccounts: AdAccount[]
  campaigns: Campaign[]
  dashboardData: AdsDashboardData | null
  isLoading: boolean
  isSyncing: boolean
  syncError: string | null

  fetchDashboard: (
    workspaceId: string,
    filters?: Parameters<typeof adsApi.getDashboard>[1]
  ) => Promise<void>
  fetchAccounts: (workspaceId: string) => Promise<void>
  syncAds: (workspaceId: string) => Promise<void>
  connectAccount: (
    workspaceId: string,
    data: ConnectAdAccountRequest
  ) => Promise<AdAccount>
  disconnectAccount: (workspaceId: string, accountId: string) => Promise<void>
}

export const useAdsStore = create<AdsState>()((set) => ({
  adAccounts: [],
  campaigns: [],
  dashboardData: null,
  isLoading: false,
  isSyncing: false,
  syncError: null,

  fetchDashboard: async (workspaceId, filters) => {
    set({ isLoading: true })
    try {
      const data = await adsApi.getDashboard(workspaceId, filters)
      set({
        dashboardData: data,
        campaigns: data.campaigns ?? [],
      })
    } finally {
      set({ isLoading: false })
    }
  },

  fetchAccounts: async (workspaceId) => {
    try {
      const accounts = await adsApi.getAccounts(workspaceId)
      set({ adAccounts: accounts })
    } catch {
      // non-critical
    }
  },

  syncAds: async (workspaceId) => {
    set({ isSyncing: true, syncError: null })
    try {
      await adsApi.syncAll(workspaceId)
      // Re-fetch dashboard after sync
      const data = await adsApi.getDashboard(workspaceId)
      set({
        dashboardData: data,
        campaigns: data.campaigns ?? [],
      })
    } catch (error) {
      const message =
        error && typeof error === "object" && "message" in error
          ? String((error as { message: string }).message)
          : "Sync failed"
      set({ syncError: message })
      throw error
    } finally {
      set({ isSyncing: false })
    }
  },

  connectAccount: async (workspaceId, data) => {
    const account = await adsApi.connectAccount(workspaceId, data)
    set((state) => ({ adAccounts: [...state.adAccounts, account] }))
    return account
  },

  disconnectAccount: async (workspaceId, accountId) => {
    await adsApi.disconnectAccount(workspaceId, accountId)
    set((state) => ({
      adAccounts: state.adAccounts.filter((a) => a.id !== accountId),
    }))
  },
}))
