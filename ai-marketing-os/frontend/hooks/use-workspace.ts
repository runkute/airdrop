"use client"

import { useAuthStore } from "@/store/auth-store"

export function useWorkspace() {
  const currentWorkspace = useAuthStore((s) => s.currentWorkspace)
  const workspaces = useAuthStore((s) => s.workspaces)
  const setCurrentWorkspace = useAuthStore((s) => s.setCurrentWorkspace)

  return {
    workspace: currentWorkspace,
    workspaces,
    workspaceId: currentWorkspace?.id ?? "",
    setCurrentWorkspace,
  }
}
