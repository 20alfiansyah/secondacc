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

/** Normalisasi produk ke bentuk frontend (category.name -> categoryName, dsb). */
function toProduct(raw: any): Product {
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

/** GET /api/products dengan filter opsional. */
export async function fetchProducts(params?: {
  categoryId?: number
  search?: string
  isAvailable?: boolean
  isRecommended?: boolean
  isBestSeller?: boolean
}): Promise<Product[]> {
  const { data } = await api.get<ListResponse<any[]>>('/products', { params })
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
  /** Alias orderId — bukti kompatibilitas utk POS rewrite (lihat blok kompat di bawah). */
  id: number
  invoiceNumber: string
  orderNumber: string
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
  const { data } = await api.get<ListResponse<any[]>>('/orders/active')
  return (data.data ?? []).map(toOrderSummary)
}

/** GET /api/orders/history — order PAID + filter tanggal & search. */
export async function fetchOrderHistory(params?: {
  from?: string
  to?: string
  search?: string
}): Promise<OrderSummary[]> {
  const { data } = await api.get<ListResponse<any[]>>('/orders/history', { params })
  return (data.data ?? []).map(toOrderSummary)
}

/** Detail order utk pratinjau struk & reprint (GET /api/orders/:id). */
export async function fetchOrderDetail(orderId: number): Promise<OrderDetail> {
  const { data } = await api.get<ListResponse<OrderDetail>>(`/orders/${orderId}`)
  return data.data
}

function toOrderSummary(raw: any): OrderSummary {
  return {
    id: raw.id,
    invoiceNumber: raw.invoiceNumber,
    orderType: raw.orderType,
    status: raw.status,
    customerName: raw.customerName ?? null,
    customerGender: raw.customerGender ?? null,
    subtotal: raw.subtotal,
    grandTotal: raw.grandTotal,
    tableNumber: raw.table?.tableNumber ?? null,
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
  orderType?: OrderType
  customerName?: string
  tableId?: number
  items: OpenBillItemInput[]
}): Promise<OpenBillResult> {
  // Default DINE_IN bila orderType tidak dikirim (POS legacy masih menyimpan
  // per-meja; field orderType akan diisi penuh di Task 1.3.4+).
  const body = {
    orderType: payload.orderType ?? 'DINE_IN',
    customerName: payload.customerName,
    tableId: payload.tableId ?? undefined,
    items: payload.items,
  }
  const { data } = await api.post<ListResponse<OpenBillResult>>('/orders/open-bill', body)
  return { ...data.data, id: data.data.orderId }
}

export interface CheckoutInput {
  customerGender?: CustomerGender
  /** Backend PRD TIDAK menyimpan customerName saat checkout (sudah di set saat
   *  open-bill). Field ini diterima utk kompatibilitas POS legacy; diabaikan. */
  customerName?: string
  paymentCategory: PaymentCategory
  methodName: string
  amountPaid: number
}

/** Bentuk legacy yang dikirim POS lama (nested `payment`). */
export interface LegacyCheckoutPayload {
  customerName?: string
  customerGender?: CustomerGender
  payment: { category: PaymentCategory; methodName: string; amountPaid: number }
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
  payload: CheckoutInput | LegacyCheckoutPayload,
): Promise<CheckoutResult> {
  // Normalisasi bentuk legacy (nested `payment`) ke bentuk flat backend PRD.
  const flat: CheckoutInput = 'payment' in payload
    ? {
        customerGender: payload.customerGender,
        paymentCategory: payload.payment.category,
        methodName: payload.payment.methodName,
        amountPaid: payload.payment.amountPaid,
      }
    : payload
  const { data } = await api.post<ListResponse<CheckoutResult>>(
    `/orders/${orderId}/checkout`,
    flat,
  )
  const result = data.data
  // Enrich data flat backend -> bentuk yang diterima ReceiptModal legacy.
  return {
    ...result,
    items: result.items ?? [],
    payment: result.payment ?? {
      category: flat.paymentCategory,
      methodName: flat.methodName,
      amountPaid: flat.amountPaid,
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
