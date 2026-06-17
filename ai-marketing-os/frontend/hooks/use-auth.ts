"use client"

import { useCallback } from "react"
import { useRouter } from "next/navigation"
import { useAuthStore } from "@/store/auth-store"
import { parseApiError } from "@/lib/utils"
import { toast } from "@/hooks/use-toast"
import type { RegisterRequest } from "@/lib/types"

export function useAuth() {
  const router = useRouter()
  const store = useAuthStore()

  const login = useCallback(
    async (email: string, password: string) => {
      try {
        await store.login(email, password)
        router.push("/dashboard")
        toast({
          title: "Welcome back!",
          description: "You have been signed in successfully.",
          variant: "default",
        })
      } catch (error) {
        toast({
          title: "Sign in failed",
          description: parseApiError(error),
          variant: "destructive",
        })
        throw error
      }
    },
    [store, router]
  )

  const register = useCallback(
    async (data: RegisterRequest) => {
      try {
        await store.register(data)
        router.push("/dashboard")
        toast({
          title: "Account created!",
          description: "Welcome to AI Marketing OS.",
          variant: "default",
        })
      } catch (error) {
        toast({
          title: "Registration failed",
          description: parseApiError(error),
          variant: "destructive",
        })
        throw error
      }
    },
    [store, router]
  )

  const logout = useCallback(async () => {
    try {
      await store.logout()
      router.push("/login")
    } catch {
      // Still redirect even if logout API fails
      router.push("/login")
    }
  }, [store, router])

  return {
    user: store.user,
    currentWorkspace: store.currentWorkspace,
    workspaces: store.workspaces,
    isAuthenticated: store.isAuthenticated,
    isLoading: store.isLoading,
    login,
    register,
    logout,
    setCurrentWorkspace: store.setCurrentWorkspace,
  }
}
