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

export interface Product {
  id: number
  name: string
  price: number
  categoryId: number
  categoryName: string
  description: string | null
  isAvailable: boolean
}

export interface CafeTable {
  id: number
  tableNumber: string
  qrIdentifier: string
  isOccupied: boolean
  activeOrder: {
    id: number
    invoiceNumber: string
    subtotal: number
    itemCount: number
  } | null
}

interface ListResponse<T> {
  success: boolean
  data: T
}

/** Ambil daftar produk; dukung filter kategori & search. */
export async function fetchProducts(params?: {
  categoryId?: number
  search?: string
}): Promise<Product[]> {
  const { data } = await api.get<ListResponse<Product[]>>('/products', {
    params: {
      category_id: params?.categoryId,
      search: params?.search || undefined,
    },
  })
  return data.data
}

/** Ambil daftar meja kafe (status terisi + info open bill). */
export async function fetchTables(): Promise<CafeTable[]> {
  const { data } = await api.get<ListResponse<CafeTable[]>>('/tables')
  return data.data
}

export interface OpenBillItemInput {
  productId: number
  quantity: number
  notes?: string
}

export interface OpenBillResult {
  id: number
  invoiceNumber: string
  tableId: number | null
  status: OrderStatus
  subtotal: number
  grandTotal: number
}

type OrderStatus = 'OPEN_BILL' | 'PAID' | 'CANCELLED'
export type PaymentCategory = 'CASH' | 'THIRD_PARTY' | 'EDC'
export type CustomerGender = 'P' | 'L'

interface OpenBillResponse {
  success: boolean
  order: OpenBillResult
}

/** Simpan pesanan sementara ke meja (status OPEN_BILL). */
export async function openBillRequest(
  payload: { tableId: number; items: OpenBillItemInput[] },
): Promise<OpenBillResult> {
  const { data } = await api.post<OpenBillResponse>('/orders/open-bill', payload)
  return data.order
}

export interface CheckoutResult {
  id: number
  invoiceNumber: string
  status: OrderStatus
  customerGender: CustomerGender | null
  grandTotal: number
  items: {
    productName: string
    quantity: number
    unitPrice: number
    notes: string | null
  }[]
  payment: {
    category: PaymentCategory
    methodName: string
    amountPaid: number
    changeDue: number
    paidAt: string | null
  }
}

interface CheckoutResponse {
  success: boolean
  order: CheckoutResult
}

export interface CheckoutPayload {
  customerGender: CustomerGender
  payment: {
    category: PaymentCategory
    methodName: string
    amountPaid: number
  }
}

/** Selesaikan pembayaran order OPEN_BILL. */
export async function checkoutRequest(
  orderId: number,
  payload: CheckoutPayload,
): Promise<CheckoutResult> {
  const { data } = await api.post<CheckoutResponse>(`/orders/${orderId}/checkout`, payload)
  return data.order
}

