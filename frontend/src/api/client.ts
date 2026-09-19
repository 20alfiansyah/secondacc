import axios from 'axios'

/** Token storage key di localStorage. */
export const TOKEN_KEY = 'cafe_pos_token'

/** Role user yang tersimpan di localStorage (untuk init store di refresh). */
export const USER_KEY = 'cafe_pos_user'

export type Role = 'ADMIN' | 'CASHIER'

export interface AuthUser {
  id: number
  username: string
  name: string
  role: Role
}

export interface LoginResponse {
  success: boolean
  token: string
  user: AuthUser
}

/**
 * Axios instance tunggal untuk seluruh aplikasi.
 * Base URL menunjuk relatif ke /api (di-proxy oleh nginx ke backend NestJS —
 * tanpa hardcode host:port di code). Bisa dioverride via VITE_API_URL saat dev.
 */
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
  headers: { 'Content-Type': 'application/json' },
})

/** Request interceptor — auto-attach JWT token dari localStorage ke Authorization. */
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
 * Response interceptor — jika backend mengembalikan 401 (token invalid/
 * kadaluarsa), bersihkan sesi & redirect ke /login.
 */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // 401 dari endpoint login itu sendiri = kredensial salah, BUKAN sesi
    // kadaluarsa — jangan bersihkan sesi / redirect (biarkan Login menampilkan error).
    const isLoginCall = error.config?.url?.includes('/auth/login')
    if (error.response?.status === 401 && !isLoginCall) {
      if (onUnauthorized) {
        onUnauthorized()
      }
    }
    return Promise.reject(error)
  },
)

/** Endpoint login: mengembalikan JWT token + user (id, username, name, role). */
export async function loginRequest(username: string, password: string) {
  const { data } = await api.post<LoginResponse>('/auth/login', { username, password })
  return data
}

// ===== Katalog & Kategori =====

export type OrderType = 'DINE_IN' | 'TAKE_AWAY'
export type OrderStatus = 'OPEN_BILL' | 'PAID' | 'CANCELLED'
export type PaymentCategory = 'CASH' | 'THIRD_PARTY' | 'EDC'
export type CustomerGender = 'L' | 'P'

export interface Product {
  id: number
  name: string
  price: number
  categoryId: number
  /** Nama kategori (dibawa dari relasi `category.name`). */
  categoryName: string
  description: string | null
  imageUrl: string | null
  isAvailable: boolean
  isRecommended: boolean
  isBestSeller: boolean
}

export interface Category {
  id: number
  name: string
  slug: string
  activeProductCount: number
}

/** Bentuk mentah produk dari backend (relasi `category` dibawa sebagai objek). */
interface RawProduct {
  id: number
  name: string
  price: number
  categoryId: number
  category?: { name: string } | null
  description: string | null
  imageUrl: string | null
  isAvailable: boolean
  isRecommended?: boolean
  isBestSeller?: boolean
}

/** Normalisasi produk ke bentuk frontend (category.name -> categoryName, dsb). */
function toProduct(raw: RawProduct): Product {
  return {
    id: raw.id,
    name: raw.name,
    price: raw.price,
    categoryId: raw.categoryId,
    categoryName: raw.category?.name ?? '',
    description: raw.description ?? null,
    imageUrl: raw.imageUrl ?? null,
    isAvailable: raw.isAvailable,
    isRecommended: raw.isRecommended ?? false,
    isBestSeller: raw.isBestSeller ?? false,
  }
}

interface ListResponse<T> {
  success: boolean
  data: T
}

/** GET /api/products — daftar produk utk katalog. */
export async function fetchProducts(): Promise<Product[]> {
  const { data } = await api.get<ListResponse<RawProduct[]>>('/products')
  return (data.data ?? []).map(toProduct)
}

/** GET /api/categories — daftar kategori + jumlah produk aktif. */
export async function fetchCategories(): Promise<Category[]> {
  const { data } = await api.get<ListResponse<Category[]>>('/categories')
  return data.data ?? []
}

// ===== Orders =====

export interface OpenBillItemInput {
  productId: number
  quantity: number
  notes?: string
}

export interface OpenBillResult {
  orderId: number
  invoiceNumber: string
  orderType: OrderType
  status: OrderStatus
  tableNumber: string | null
  customerName: string | null
  subtotal: number
  grandTotal: number
}

/** Ringkasan order utk Active Orders Line & History. */
export interface OrderSummary {
  id: number
  invoiceNumber: string
  orderType: OrderType
  status: OrderStatus
  customerName: string | null
  customerGender: CustomerGender | null
  subtotal: number
  grandTotal: number
  tableNumber: string | null
  itemCount: number
  createdAt: string
  paymentName?: string | null
}

/** GET /api/orders/active — seluruh order OPEN_BILL. */
export async function fetchActiveOrders(): Promise<OrderSummary[]> {
  const { data } = await api.get<ListResponse<RawOrder[]>>('/orders/active')
  return (data.data ?? []).map(toOrderSummary)
}

/** GET /api/orders/history — order PAID. */
export async function fetchOrderHistory(): Promise<OrderSummary[]> {
  const { data } = await api.get<ListResponse<RawOrder[]>>('/orders/history')
  return (data.data ?? []).map(toOrderSummary)
}

/** Detail order utk pratinjau struk & reprint (GET /api/orders/:id). */
export async function fetchOrderDetail(orderId: number): Promise<OrderDetail> {
  const { data } = await api.get<ListResponse<OrderDetail>>(`/orders/${orderId}`)
  return data.data
}

/** Bentuk mentah order dari backend (list aktif / riwayat / detail). */
interface RawOrder {
  id: number
  invoiceNumber: string
  orderType: OrderType
  status: OrderStatus
  customerName?: string | null
  customerGender?: CustomerGender | null
  subtotal: number
  grandTotal: number
  tableNumber?: string | null
  itemCount?: number
  orderItems?: unknown[]
  _count?: { orderItems?: number }
  createdAt: string
  payment?: { methodName: string } | null
}

function toOrderSummary(raw: RawOrder): OrderSummary {
  return {
    id: raw.id,
    invoiceNumber: raw.invoiceNumber,
    orderType: raw.orderType,
    status: raw.status,
    customerName: raw.customerName ?? null,
    customerGender: raw.customerGender ?? null,
    subtotal: raw.subtotal,
    grandTotal: raw.grandTotal,
    tableNumber: raw.tableNumber ?? null,
    // Backend /orders/active menghitung itemCount = TOTAL qty (jumlah item, bukan
    // jumlah baris). Pakai field tsb bila tersedia; fallback lama utk endpoint lain.
    itemCount:
      typeof raw.itemCount === 'number'
        ? raw.itemCount
        : Array.isArray(raw.orderItems)
          ? raw.orderItems.length
          : (raw._count?.orderItems ?? 0),
    createdAt: raw.createdAt,
    paymentName: raw.payment?.methodName ?? null,
  }
}

/** POST /api/orders/open-bill — simpan order baru berstatus OPEN_BILL. */
export async function openBillRequest(payload: {
  orderType: OrderType
  customerName?: string
  customerGender?: CustomerGender
  items: OpenBillItemInput[]
}): Promise<OpenBillResult> {
  const { data } = await api.post<ListResponse<OpenBillResult>>('/orders/open-bill', {
    orderType: payload.orderType,
    customerName: payload.customerName,
    customerGender: payload.customerGender ?? undefined,
    items: payload.items,
  })
  return data.data
}

/** Hasil PUT /orders/:id/items — ringkasan order yang sudah diperbarui. */
export interface UpdateOrderItemsResult {
  orderId: number
  invoiceNumber: string
  orderType: OrderType
  status: OrderStatus
  customerName: string | null
  subtotal: number
  grandTotal: number
}

/** PUT /api/orders/:id/items — full replace items order OPEN_BILL (edit tiket). */
export async function updateOrderItemsRequest(
  orderId: number,
  payload: {
    customerName?: string
    customerGender?: CustomerGender
    items: OpenBillItemInput[]
  },
): Promise<UpdateOrderItemsResult> {
  const { data } = await api.put<ListResponse<UpdateOrderItemsResult>>(`/orders/${orderId}/items`, {
    customerName: payload.customerName?.trim() || undefined,
    customerGender: payload.customerGender ?? undefined,
    items: payload.items,
  })
  return data.data
}

export interface CheckoutInput {
  customerGender: CustomerGender
  paymentCategory: PaymentCategory
  methodName: string
  amountPaid: number
}

export interface CheckoutResult {
  invoiceNumber: string
  status: OrderStatus
  orderType: OrderType
  customerGender: CustomerGender | null
  customerName: string | null
  grandTotal: number
  amountPaid: number
  changeDue: number
  paidAt: string | null
  cashierName: string | null
  tableNumber: string | null
  /**
   * Kompatibilitas ReceiptModal legacy. Backend checkout TIDAK mengembalikan
   * items/payment — diisi ulang oleh checkoutRequest dari data flat.
   */
  items: OrderItemLine[]
  payment: {
    category: PaymentCategory
    methodName: string
    amountPaid: number
    changeDue: number
    paidAt: string | null
  }
}

/** POST /api/orders/:id/checkout — selesaikan pembayaran order OPEN_BILL. */
export async function checkoutRequest(
  orderId: number,
  payload: CheckoutInput,
): Promise<CheckoutResult> {
  const { data } = await api.post<ListResponse<CheckoutResult>>(
    `/orders/${orderId}/checkout`,
    payload,
  )
  const result = data.data
  // Enrich data flat backend -> bentuk yang diterima ReceiptModal.
  return {
    ...result,
    items: result.items ?? [],
    payment: result.payment ?? {
      category: payload.paymentCategory,
      methodName: payload.methodName,
      amountPaid: payload.amountPaid,
      changeDue: result.changeDue ?? 0,
      paidAt: result.paidAt ?? null,
    },
  }
}

/** Item order di detail struk / re-print (disusun dari data yang tersedia). */
export interface OrderItemLine {
  productId?: number
  productName: string
  quantity: number
  unitPrice: number
  subtotal: number
  notes: string | null
}

/** Detail order untuk struk ReceiptModal (alur bayar / re-print). */
export interface OrderDetail {
  id: number
  invoiceNumber: string
  status: OrderStatus
  orderType: OrderType
  customerName: string | null
  customerGender: CustomerGender | null
  cashierName: string | null
  tableId: number | null
  tableNumber: string | null
  subtotal: number
  grandTotal: number
  createdAt: string
  items: OrderItemLine[]
  payment: {
    category: PaymentCategory
    methodName: string
    amountPaid: number
    changeDue: number
    paidAt: string | null
  } | null
}
