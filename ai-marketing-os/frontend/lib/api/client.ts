import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios"
import Cookies from "js-cookie"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"

class ApiClient {
  private client: AxiosInstance

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      timeout: 30000,
      headers: {
        "Content-Type": "application/json",
      },
    })

    this.setupInterceptors()
  }

  private setupInterceptors() {
    // Request interceptor - add auth token
    this.client.interceptors.request.use(
      (config) => {
        const token = Cookies.get("access_token")
        if (token) {
          config.headers.Authorization = `Bearer ${token}`
        }
        // Add workspace header if available
        const workspaceId =
          typeof window !== "undefined"
            ? localStorage.getItem("current_workspace_id")
            : null
        if (workspaceId) {
          config.headers["X-Workspace-ID"] = workspaceId
        }
        return config
      },
      (error) => Promise.reject(error)
    )

    // Response interceptor - handle 401, refresh token
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true
          try {
            const refreshToken = Cookies.get("refresh_token")
            if (!refreshToken) throw new Error("No refresh token")

            const response = await axios.post(`${API_URL}/auth/refresh`, {
              refresh_token: refreshToken,
            })

            const { access_token, refresh_token } = response.data
            Cookies.set("access_token", access_token, { expires: 1 })
            Cookies.set("refresh_token", refresh_token, { expires: 7 })

            originalRequest.headers.Authorization = `Bearer ${access_token}`
            return this.client(originalRequest)
          } catch {
            Cookies.remove("access_token")
            Cookies.remove("refresh_token")
            if (typeof window !== "undefined") {
              window.location.href = "/login"
            }
          }
        }
        return Promise.reject(error)
      }
    )
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.get(url, config)
    return response.data
  }

  async post<T>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const response: AxiosResponse<T> = await this.client.post(url, data, config)
    return response.data
  }

  async put<T>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const response: AxiosResponse<T> = await this.client.put(url, data, config)
    return response.data
  }

  async patch<T>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const response: AxiosResponse<T> = await this.client.patch(url, data, config)
    return response.data
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.delete(url, config)
    return response.data
  }
}

export const apiClient = new ApiClient()
