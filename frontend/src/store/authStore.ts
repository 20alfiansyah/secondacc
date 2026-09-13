import { create } from 'zustand'
import type { AuthUser } from '@/api/client'
import { TOKEN_KEY, USER_KEY, loginRequest } from '@/api/client'
import { useCartStore } from './cartStore'

interface AuthState {
  token: string | null
  user: AuthUser | null
  login: (username: string, password: string) => Promise<AuthUser>
  logout: () => void
}

/** Memuat ulang sesi dari localStorage saat refresh halaman. */
function loadStoredSession(): { token: string | null; user: AuthUser | null } {
  const token = localStorage.getItem(TOKEN_KEY)
  const rawUser = localStorage.getItem(USER_KEY)
  try {
    return { token, user: rawUser ? (JSON.parse(rawUser) as AuthUser) : null }
  } catch {
    return { token, user: null }
  }
}

export const useAuthStore = create<AuthState>((set) => {
  const stored = loadStoredSession()

  return {
    token: stored.token,
    user: stored.user,

    login: async (username, password) => {
      const res = await loginRequest(username, password)
      localStorage.setItem(TOKEN_KEY, res.token)
      localStorage.setItem(USER_KEY, JSON.stringify(res.user))
      set({ token: res.token, user: res.user })
      return res.user
    },

    logout: () => {
      // Keranjang ikut dibersihkan agar sesi berikutnya tidak mewarisi tiket lama.
      useCartStore.getState().clear()
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(USER_KEY)
      set({ token: null, user: null })
    },
  }
})
