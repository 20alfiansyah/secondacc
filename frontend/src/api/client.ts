import axios from 'axios'

/** Token storage key di localStorage. */
export const TOKEN_KEY = 'cafe_pos_token'

/** Role user yang tersimpan di localStorage (untuk init store di refresh). */
export const USER_KEY = 'cafe_pos_user'

export interface AuthUser {
  id: number
  username: string
  name: string
  role: 'ADMIN' | 'CASHIER' | 'INVENTORY'
}

export interface LoginResponse {
  success: boolean
  token: string
  user: AuthUser
}

/**
 * Axios instance tunggal untuk seluruh aplikasi.
 * Base URL menunjuk ke backend NestJS pada /api.
 */
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api',
  headers: { 'Content-Type': 'application/json' },
})

/**
 * Request interceptor — auto-attach JWT token dari localStorage
 * ke header Authorization (Bearer) pada setiap request.
 */
api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

let onUnauthorized: (() => void) | null = null

/** Registrasi handler yang dipanggil saat API menolak (401). */
export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler
}

/**
 * Response interceptor — jika backend mengembalikan 401
 * (token invalid/kadaluarsa), bersihkan sesi & redirect ke /login.
 */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(USER_KEY)
      if (onUnauthorized) {
        onUnauthorized()
      }
    }
    return Promise.reject(error)
  },
)

/** Endpoint login: mengembalikan JWT token + role. */
export async function loginRequest(username: string, password: string) {
  const { data } = await api.post<LoginResponse>('/auth/login', { username, password })
  return data
}
