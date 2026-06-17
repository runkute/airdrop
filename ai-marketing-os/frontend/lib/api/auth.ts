import { apiClient } from "./client"
import type {
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  User,
  UpdateProfileRequest,
  ChangePasswordRequest,
} from "@/lib/types"

export const authApi = {
  register: (data: RegisterRequest) =>
    apiClient.post<AuthResponse>("/auth/register", data),

  login: (data: LoginRequest) =>
    apiClient.post<AuthResponse>("/auth/login", data),

  refresh: (refreshToken: string) =>
    apiClient.post<AuthResponse>("/auth/refresh", {
      refresh_token: refreshToken,
    }),

  logout: (refreshToken: string) =>
    apiClient.post("/auth/logout", { refresh_token: refreshToken }),

  getMe: () => apiClient.get<User>("/auth/me"),

  updateProfile: (data: UpdateProfileRequest) =>
    apiClient.patch<User>("/auth/me", data),

  changePassword: (data: ChangePasswordRequest) =>
    apiClient.post("/auth/me/change-password", data),
}
