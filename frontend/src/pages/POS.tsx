import { useEffect, useMemo, useState } from 'react'
import {
  ArrowUpDown,
  Banknote,
  CheckCircle2,
  Coffee,
  Cookie,
  CreditCard,
  CupSoda,
  Filter,
  History,
  LayoutGrid,
  Minus,
  Plus,
  Receipt,
  Search,
  ShoppingBag,
  SlidersHorizontal,
  Sparkles,
  StickyNote,
  Trash2,
  User,
  Utensils,
  X,
} from 'lucide-react'
import type { CafeTable, CustomerGender, Product } from '@/api/client'
import {
  checkoutRequest,
  fetchActiveOrders,
  fetchOrderDetail,
  fetchOrders,
  fetchProducts,
  fetchTables,
  openBillRequest,
} from '@/api/client'
import type { OpenBillItemInput, OrderDetail, OrderSummary } from '@/api/client'
import { useAuthStore } from '@/store/authStore'
import { useCartStore } from '@/store/cartStore'
import { formatRupiah } from '@/utils/format'
import { getProductImage } from '@/utils/productImages'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import PaymentModal from '@/components/PaymentModal'
import ReceiptModal from '@/components/ReceiptModal'
import CustomItemModal from '@/components/CustomItemModal'
import NavigationRail from '@/components/NavigationRail'
import ActiveOrdersLine from '@/components/ActiveOrdersLine'
import type { CheckoutResult } from '@/api/client'

interface CategoryTab {
  id: number | 'all'
  name: string
}

type SortOption = 'default' | 'price-asc' | 'price-desc' | 'name-asc'
type AvailabilityFilter = 'all' | 'available' | 'sold-out'

function getCategoryIcon(name: string) {
  const lower = name.toLowerCase()
  if (lower.includes('kopi') || lower.includes('coffee')) return Coffee
  if (lower.includes('makan') || lower.includes('heavy') || lower.includes('food')) return Utensils
  if (lower.includes('snack') || lower.includes('cemilan') || lower.includes('roti')) return Cookie
  if (lower.includes('non') || lower.includes('drink') || lower.includes('tea') || lower.includes('soda'))
    return CupSoda
  return Sparkles
}

function customerNameOr(defaultName: string, name: string | null | undefined): string {
  return name?.trim() ? name : defaultName
}

export default function POS() {
  const { user } = useAuthStore()
  const { items, increase, decrease, addItem, setNotes, removeItem, clear } = useCartStore()

  const [products, setProducts] = useState<Product[]>([])
  const [tables, setTables] = useState<CafeTable[]>([])
  const [recentOrders, setRecentOrders] = useState<OrderSummary[]>([])
  const [activeCategory, setActiveCategory] = useState<number | 'all'>('all')
  const [search, setSearch] = useState('')
  const [availabilityFilter, setAvailabilityFilter] = useState<AvailabilityFilter>('all')
  const [sortOption, setSortOption] = useState<SortOption>('default')
  const [selectedTable, setSelectedTable] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [opening, setOpening] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [feedbackError, setFeedbackError] = useState(false)

  // Drawer keranjang di mobile/tablet
  const [mobileCartOpen, setMobileCartOpen] = useState(false)

  // Custom Item Modal state
  const [customModalProduct, setCustomModalProduct] = useState<Product | null>(null)
  const [customModalOpen, setCustomModalOpen] = useState(false)

  // ---- ORDER DETAIL panel state ----
  // mode: 'new' = keranjang baru; 'open' = order OPEN_BILL yang sedang di-view
  const [panelMode, setPanelMode] = useState<'new' | 'open'>('new')
  const [openOrder, setOpenOrder] = useState<OrderDetail | null>(null)

  // Field customer (diisi di panel)
  const [customerName, setCustomerName] = useState('')
  const [customerGender, setCustomerGender] = useState<CustomerGender | null>(null)

  // Payment / receipt / history state
  const [payOpen, setPayOpen] = useState(false)
  const [submittingPayment, setSubmittingPayment] = useState(false)
  const [receipt, setReceipt] = useState<CheckoutResult | null>(null)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [historyData, setHistoryData] = useState<OrderSummary[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [reprint, setReprint] = useState<OrderDetail | null>(null)
  const [reprintLoading, setReprintLoading] = useState<number | null>(null)

  async function loadData() {
    const [productData, tableData, orderData] = await Promise.all([
      fetchProducts(),
      fetchTables(),
      fetchActiveOrders(),
    ])
    setProducts(productData)
    setTables(tableData)
    setRecentOrders(orderData)
  }

  useEffect(() => {
    let cancelled = false
    async function init() {
      try {
        await loadData()
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    init()
    return () => {
      cancelled = true
    }
  }, [])

  // Tab kategori diturunkan dari data produk.
  const categoryTabs: CategoryTab[] = useMemo(() => {
    const seen = new Map<number, string>()
    for (const p of products) seen.set(p.categoryId, p.categoryName)
    const tabs: CategoryTab[] = Array.from(seen.entries()).map(([id, name]) => ({
      id,
      name,
    }))
    return [{ id: 'all', name: 'Semua Menu' }, ...tabs]
  }, [products])

  // Filtering & Sorting yang canggih
  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase()
    const result = products.filter((p) => {
      if (activeCategory !== 'all' && p.categoryId !== activeCategory) return false
      if (availabilityFilter === 'available' && !p.isAvailable) return false
      if (availabilityFilter === 'sold-out' && p.isAvailable) return false
      if (q && !p.name.toLowerCase().includes(q)) return false
      return true
    })

    if (sortOption === 'price-asc') {
      return result.sort((a, b) => a.price - b.price)
    }
    if (sortOption === 'price-desc') {
      return result.sort((a, b) => b.price - a.price)
    }
    if (sortOption === 'name-asc') {
      return result.sort((a, b) => a.name.localeCompare(b.name))
    }
    return result
  }, [products, activeCategory, availabilityFilter, sortOption, search])

  const cartSubtotal = items.reduce((sum, i) => sum + i.product.price * i.quantity, 0)
  const cartItemCount = items.reduce((sum, i) => sum + i.quantity, 0)

  const occupiedCount = tables.filter((t) => t.isOccupied).length
  const emptyCount = tables.length - occupiedCount
  const currentTableObj = tables.find((t) => t.id === selectedTable)

  function showFeedback(message: string, isError = false) {
    setFeedback(message)
    setFeedbackError(isError)
    setTimeout(() => setFeedback(null), 4000)
  }

  // Buka modal custom untuk produk setiap kali kasir ingin menambah pesanan
  function handleOpenCustom(product: Product) {
    if (!product.isAvailable) return
    setCustomModalProduct(product)
    setCustomModalOpen(true)
  }

  // Handle konfirmasi custom options
  function handleCustomConfirm(product: Product, options: { notes?: string; quantity: number }) {
    addItem(product, options)
  }

  // Klik kartu ACTIVE ORDERS -> muat pesanan ke panel (Zone 2 Top, Task 1.3.4).
  // Backend PRD belum menyediakan GET /orders/:id, jadi panel diisi dari ringkasan
  // Active Orders; detail item lengkap + tombol aksi disempurnakan di Task 1.3.8.
  function handleOpenActiveOrder(orderId: number) {
    const summary = recentOrders.find((o) => o.id === orderId)
    if (!summary) {
      showFeedback('Gagal memuat detail pesanan. Silakan coba lagi.', true)
      return
    }
    setPanelMode('open')
    setOpenOrder({
      id: summary.id,
      invoiceNumber: summary.invoiceNumber,
      status: summary.status,
      orderType: summary.orderType,
      customerName: summary.customerName,
      customerGender: summary.customerGender,
      tableId: null,
      tableNumber: summary.tableNumber,
      subtotal: summary.subtotal,
      grandTotal: summary.grandTotal,
      createdAt: summary.createdAt,
      items: [],
      payment: null,
    })
    setCustomerName(summary.customerName ?? '')
    setCustomerGender(summary.customerGender)
  }

  // Klik meja -> mulai order baru (panel berubah ke mode 'new')
  function handleSelectTable(tableId: number) {
    setSelectedTable(tableId)
    setPanelMode('new')
    setOpenOrder(null)
  }

  // Mulai pesanan baru dari nol (kosongkan hp panel)
  function handleNewOrder() {
    setPanelMode('new')
    setOpenOrder(null)
    clear()
  }

  // ---- Open Bill (simpan order baru dari keranjang) ----
  async function handleOpenBill() {
    if (!selectedTable || items.length === 0) return
    setOpening(true)
    setFeedback(null)
    try {
      const payload: OpenBillItemInput[] = items.map((i) => ({
        productId: i.product.id,
        quantity: i.quantity,
        notes: i.notes?.trim() ? i.notes : undefined,
      }))
      const saved = await openBillRequest({
        customerName: customerName.trim() || undefined,
        tableId: selectedTable,
        items: payload,
      })
      clear() // keranjang reset otomatis setelah sukses
      await loadData() // refresh: meja terisi, RECENT ORDERS bertambah
      // Buka order yang baru disimpan langsung di panel (Active Orders Line)
      handleOpenActiveOrder(saved.id)
      setMobileCartOpen(false)
      showFeedback('Pesanan berhasil disimpan ke meja.')
    } catch {
      showFeedback('Gagal menyimpan pesanan. Silakan coba lagi.', true)
    } finally {
      setOpening(false)
    }
  }

  // ---- Bayar (create-then-pay untuk order baru / langsung bayar order open) ----
  async function handleCheckout(payload: {
    customerGender: CustomerGender
    payment: { category: 'CASH' | 'THIRD_PARTY' | 'EDC'; methodName: string; amountPaid: number }
  }) {
    setSubmittingPayment(true)
    try {
      let orderId: number
      if (panelMode === 'open' && openOrder) {
        orderId = openOrder.id
      } else {
        // Order baru belum pernah di-open-bill: buat dulu, lalu bayar (create-then-pay)
        if (!selectedTable) {
          showFeedback('Silakan pilih nomor meja terlebih dahulu.', true)
          setSubmittingPayment(false)
          return
        }
        const itemsPayload: OpenBillItemInput[] = items.map((i) => ({
          productId: i.product.id,
          quantity: i.quantity,
          notes: i.notes?.trim() ? i.notes : undefined,
        }))
        const created = await openBillRequest({
          customerName: customerName.trim() || undefined,
          tableId: selectedTable,
          items: itemsPayload,
        })
        orderId = created.id
      }

      const done = await checkoutRequest(orderId, {
        customerName: customerName.trim() || undefined,
        customerGender: payload.customerGender,
        payment: payload.payment,
      })
      setPayOpen(false)
      setOpenOrder(null)
      setPanelMode('new')
      clear()
      await loadData() // refresh: meja kosong, kartu OPEN_BILL hilang, paid history bertambah
      setReceipt(done) // tampilkan pratinjau struk setelah transaksi sukses
    } catch {
      showFeedback('Gagal memproses pembayaran. Silakan coba lagi.', true)
    } finally {
      setSubmittingPayment(false)
    }
  }

  // ---- Lock Register (kunci sesi kasir; implementasi penuh di task shift) ----
  function lockRegister() {
    // Fase 1: placeholder hingga task shift/lock register tersedia.
    showFeedback('Lock Register belum tersedia di fase ini.')
  }

  // ---- Riwayat order PAID + re-print struk ----
  async function openHistory() {
    setHistoryOpen(true)
    setHistoryLoading(true)
    try {
      const orders = await fetchOrders('PAID')
      setHistoryData(orders)
    } catch {
      showFeedback('Gagal memuat riwayat transaksi.', true)
    } finally {
      setHistoryLoading(false)
    }
  }

  async function handleReprint(orderId: number) {
    setReprintLoading(orderId)
    try {
      const detail = await fetchOrderDetail(orderId)
      setReprint(detail)
    } catch {
      showFeedback('Gagal memuat struk. Silakan coba lagi.', true)
    } finally {
      setReprintLoading(null)
    }
  }

  // Panel ORDER DETAIL dalam mode 'new' (keranjang) vs 'open' (order dibuka ulang)
  const isNewPanel = panelMode === 'new'

  return (
    <div className="flex h-svh bg-background selection:bg-primary/20 selection:text-primary">
      {/* ===== Zone 1: Slim Left Navigation Rail ===== */}
      <NavigationRail onOpenHistory={openHistory} onLockRegister={lockRegister} />

      {/* ===== Main Column (semua zona lainnya) ===== */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* ===== Sleek Header ===== */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-border/70 bg-card/80 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-xs">
              <Coffee className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold tracking-tight text-foreground">Cafe POS</h1>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Kasir: <span className="font-medium text-foreground">{user?.name || 'Staf'}</span>
              </p>
            </div>
          </div>

          {/* Quick Table Stats Pill */}
          <div className="hidden items-center gap-3 md:flex">
            <div className="flex items-center gap-2 rounded-full border border-border/80 bg-secondary/50 px-3.5 py-1 text-xs font-medium text-muted-foreground">
              <span className="flex items-center gap-1 text-emerald-600">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                {emptyCount} Meja Kosong
              </span>
              <span className="text-border">|</span>
              <span className="flex items-center gap-1 text-amber-600">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                {occupiedCount} Terisi
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Mobile Cart Button trigger in Header */}
            <button
              onClick={() => setMobileCartOpen(true)}
              className="relative flex items-center gap-2 rounded-xl border border-border/80 bg-card px-3 py-1.5 text-xs font-bold text-foreground lg:hidden"
            >
              <ShoppingBag className="h-4 w-4 text-primary" />
              <span>Keranjang</span>
              {cartItemCount > 0 && (
                <span className="rounded-full bg-primary px-1.5 py-0.2 text-[10px] font-bold text-primary-foreground tabular-nums">
                  {cartItemCount}
                </span>
              )}
            </button>
          </div>
        </header>

      {/* ===== Main Content Area ===== */}
      <div className="grid flex-1 grid-cols-1 gap-5 overflow-hidden p-4 sm:p-5 lg:grid-cols-[1fr_420px]">
        {/* ===== Left Column: Menu Catalog + RECENT ORDERS ===== */}
        <div className="flex min-h-0 flex-col">
          {/* Search, Filter Toolbar & Category Tabs */}
          <div className="mb-4 space-y-3">
            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
                <Input
                  className="h-11 rounded-2xl pl-10 pr-9 bg-card shadow-subtle border-border/80 text-sm"
                  placeholder="Cari nama menu..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
                <div className="flex items-center gap-1 rounded-xl border border-border/80 bg-card p-1 shadow-subtle text-xs">
                  <Filter className="h-3.5 w-3.5 text-muted-foreground ml-1 mr-0.5" />
                  <select
                    value={availabilityFilter}
                    onChange={(e) => setAvailabilityFilter(e.target.value as AvailabilityFilter)}
                    className="bg-transparent text-xs font-semibold text-foreground focus:outline-none cursor-pointer pr-1"
                  >
                    <option value="all">Semua Status</option>
                    <option value="available">Tersedia</option>
                    <option value="sold-out">Sold Out</option>
                  </select>
                </div>

                <div className="flex items-center gap-1 rounded-xl border border-border/80 bg-card p-1 shadow-subtle text-xs">
                  <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground ml-1 mr-0.5" />
                  <select
                    value={sortOption}
                    onChange={(e) => setSortOption(e.target.value as SortOption)}
                    className="bg-transparent text-xs font-semibold text-foreground focus:outline-none cursor-pointer pr-1"
                  >
                    <option value="default">Urutan Default</option>
                    <option value="price-asc">Harga: Rendah → Tinggi</option>
                    <option value="price-desc">Harga: Tinggi → Rendah</option>
                    <option value="name-asc">Nama: A → Z</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Category Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-1.5 scrollbar-none">
              {categoryTabs.map((tab) => {
                const isActive = activeCategory === tab.id
                const Icon = tab.id === 'all' ? LayoutGrid : getCategoryIcon(tab.name)
                const count =
                  tab.id === 'all'
                    ? products.length
                    : products.filter((p) => p.categoryId === tab.id).length

                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveCategory(tab.id)}
                    className={cn(
                      'group flex shrink-0 items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-all duration-150 active:scale-[0.98]',
                      isActive
                        ? 'border-primary bg-primary text-primary-foreground shadow-xs'
                        : 'border-border/80 bg-card text-muted-foreground hover:border-border hover:bg-accent hover:text-foreground',
                    )}
                  >
                    <Icon className={cn('h-3.5 w-3.5', isActive ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-foreground')} />
                    <span>{tab.name}</span>
                    <span
                      className={cn(
                        'rounded-full px-1.5 py-0.2 text-[10px] font-bold tabular-nums',
                        isActive
                          ? 'bg-primary-foreground/20 text-primary-foreground'
                          : 'bg-muted text-muted-foreground',
                      )}
                    >
                      {count}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Feedback Banner */}
          {feedback && (
            <div
              className={cn(
                'mb-3 flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium shadow-subtle animate-in fade-in duration-200',
                feedbackError
                  ? 'border-destructive/20 bg-destructive/10 text-destructive'
                  : 'border-primary/20 bg-primary/10 text-primary',
              )}
            >
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{feedback}</span>
            </div>
          )}

          {/* Zone 2 Top — Persistent Active Orders Line (Task 1.3.4) */}
          <ActiveOrdersLine
            orders={recentOrders}
            activeOrderId={panelMode === 'open' ? openOrder?.id ?? null : null}
            onSelect={handleOpenActiveOrder}
          />

          {/* Product Cards Grid */}
          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            {loading ? (
              <div className="flex h-64 flex-col items-center justify-center gap-2 text-muted-foreground">
                <Coffee className="h-8 w-8 animate-bounce text-primary/60" />
                <p className="text-sm font-medium">Memuat katalog menu...</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="flex h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 p-8 text-center text-muted-foreground">
                <Search className="mb-2 h-8 w-8 opacity-40" />
                <p className="text-sm font-medium text-foreground">Menu tidak ditemukan</p>
                <p className="text-xs">Coba ubah kata kunci pencarian atau filter status.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 pb-20 lg:pb-4">
                {filteredProducts.map((product) => {
                  const imageUrl = getProductImage(product.name, product.categoryName)
                  return (
                    <div
                      key={product.id}
                      onClick={() => product.isAvailable && handleOpenCustom(product)}
                      className={cn(
                        'group relative flex flex-col justify-between overflow-hidden rounded-2xl border bg-card text-left shadow-card transition-all duration-200 select-none',
                        product.isAvailable
                          ? 'cursor-pointer border-border/70 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-card-hover active:scale-[0.98]'
                          : 'cursor-not-allowed border-border/40 opacity-60 bg-muted/30',
                      )}
                    >
                      <div className="relative h-32 sm:h-36 w-full overflow-hidden bg-muted">
                        <img
                          src={imageUrl}
                          alt={product.name}
                          loading="lazy"
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          onError={(e) => {
                            ;(e.target as HTMLImageElement).src =
                              'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=500&auto=format&fit=crop&q=80'
                          }}
                        />
                        <div className="absolute left-2.5 top-2.5">
                          <span className="rounded-full bg-black/50 px-2.5 py-0.5 text-[10px] font-bold text-white backdrop-blur-md">
                            {product.categoryName}
                          </span>
                        </div>
                        {!product.isAvailable && (
                          <div className="absolute right-2.5 top-2.5">
                            <span className="rounded-full bg-destructive/90 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-destructive-foreground backdrop-blur-sm">
                              Sold Out
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-1 flex-col justify-between p-3.5">
                        <div>
                          <h3 className="line-clamp-1 text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                            {product.name}
                          </h3>
                          {product.description && (
                            <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground leading-tight">
                              {product.description}
                            </p>
                          )}
                        </div>

                        <div className="mt-3.5 flex items-center justify-between border-t border-border/50 pt-2.5">
                          <span className="text-sm sm:text-[15px] font-extrabold tracking-tight text-foreground tabular-nums">
                            {formatRupiah(product.price)}
                          </span>

                          {product.isAvailable ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleOpenCustom(product)
                              }}
                              className="flex h-9 items-center gap-1.5 rounded-xl bg-primary px-3 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-all active:scale-90 shadow-xs"
                            >
                              <Plus className="h-3.5 w-3.5" />
                              <span>Pesan</span>
                            </button>
                          ) : (
                            <span className="text-[11px] font-semibold text-muted-foreground italic">
                              Habis
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* ===== Right Column (Desktop): ORDER DETAIL Panel ===== */}
        <Card className="hidden lg:flex min-h-0 flex-col overflow-hidden border-border/80 bg-card shadow-card">
          <CardContent className="flex h-full min-h-0 flex-col p-4">
            {isNewPanel ? (
              <NewOrderDetail
                items={items}
                tables={tables}
                selectedTable={selectedTable}
                currentTableObj={currentTableObj}
                cartSubtotal={cartSubtotal}
                cartItemCount={cartItemCount}
                customerName={customerName}
                setCustomerName={setCustomerName}
                customerGender={customerGender}
                setCustomerGender={setCustomerGender}
                onSelectTable={handleSelectTable}
                onIncrease={increase}
                onDecrease={decrease}
                onSetNotes={setNotes}
                onRemoveItem={removeItem}
                onClearCart={clear}
                opening={opening}
                onOpenBill={handleOpenBill}
                onPay={() => setPayOpen(true)}
              />
            ) : (
              <OpenOrderDetail
                order={openOrder}
                loading={false}
                customerName={customerName}
                setCustomerName={setCustomerName}
                customerGender={customerGender}
                setCustomerGender={setCustomerGender}
                onNewOrder={handleNewOrder}
                onPay={() => setPayOpen(true)}
                submittingPayment={submittingPayment}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* ===== Floating Mobile/Tablet Cart Bar (Bottom) ===== */}
      <div className="fixed bottom-0 left-0 right-0 z-30 flex items-center justify-between border-t border-border/80 bg-card/95 px-4 py-3 backdrop-blur-md shadow-modal lg:hidden">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-muted-foreground">
              {currentTableObj ? currentTableObj.tableNumber : 'Belum pilih meja'}
            </span>
            <span className="text-xs text-border">•</span>
            <span className="text-xs font-bold text-foreground tabular-nums">
              {cartItemCount} item
            </span>
          </div>
          <p className="text-base font-black text-primary tabular-nums">
            {formatRupiah(cartSubtotal)}
          </p>
        </div>

        <Button
          onClick={() => setMobileCartOpen(true)}
          className="h-11 px-5 font-bold shadow-sm"
        >
          <ShoppingBag className="h-4 w-4" />
          Lihat Keranjang
          {cartItemCount > 0 && (
            <span className="ml-1 rounded-full bg-primary-foreground/20 px-1.5 py-0.2 text-xs font-bold text-primary-foreground">
              {cartItemCount}
            </span>
          )}
        </Button>
      </div>

      {/* ===== Mobile/Tablet Panel Slide-Over Drawer Sheet ===== */}
      {mobileCartOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-sm lg:hidden animate-in fade-in duration-200">
          <div className="flex max-h-[90vh] w-full flex-col rounded-t-3xl border-t border-border/80 bg-card p-5 shadow-modal animate-in slide-in-from-bottom duration-200">
            <div className="mb-3 flex items-center justify-between border-b border-border/70 pb-3">
              <div className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-primary" />
                <h2 className="text-base font-bold text-foreground">Detail Pesanan</h2>
              </div>
              <button
                onClick={() => setMobileCartOpen(false)}
                className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {isNewPanel ? (
                <NewOrderDetail
                  items={items}
                  tables={tables}
                  selectedTable={selectedTable}
                  currentTableObj={currentTableObj}
                  cartSubtotal={cartSubtotal}
                  cartItemCount={cartItemCount}
                  customerName={customerName}
                  setCustomerName={setCustomerName}
                  customerGender={customerGender}
                  setCustomerGender={setCustomerGender}
                  onSelectTable={handleSelectTable}
                  onIncrease={increase}
                  onDecrease={decrease}
                  onSetNotes={setNotes}
                  onRemoveItem={removeItem}
                  onClearCart={clear}
                  opening={opening}
                  onOpenBill={handleOpenBill}
                  onPay={() => setPayOpen(true)}
                />
              ) : (
                <OpenOrderDetail
                  order={openOrder}
                  loading={false}
                  customerName={customerName}
                  setCustomerName={setCustomerName}
                  customerGender={customerGender}
                  setCustomerGender={setCustomerGender}
                  onNewOrder={handleNewOrder}
                  onPay={() => setPayOpen(true)}
                  submittingPayment={submittingPayment}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===== Modals ===== */}
      <CustomItemModal
        product={customModalProduct}
        isOpen={customModalOpen}
        onClose={() => setCustomModalOpen(false)}
        onConfirm={handleCustomConfirm}
      />

      {payOpen && (
        <PaymentModal
          grandTotal={isNewPanel ? cartSubtotal : openOrder?.grandTotal ?? 0}
          itemCount={isNewPanel ? cartItemCount : openOrder?.items.reduce((s, i) => s + i.quantity, 0) ?? 0}
          tableNumber={
            currentTableObj
              ? currentTableObj.tableNumber.replace(/\D/g, '')
              : openOrder?.tableNumber?.replace(/\D/g, '') ?? null
          }
          gender={customerGender}
          submitting={submittingPayment}
          onSubmit={handleCheckout}
          onClose={() => setPayOpen(false)}
        />
      )}

      {receipt && <ReceiptModal order={receipt} onClose={() => setReceipt(null)} />}

      {/* Riwayat Transaksi (PAID) + Re-print */}
      {historyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-border/80 bg-card shadow-modal animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-border/70 px-5 py-4 bg-muted/30">
              <div className="flex items-center gap-2">
                <History className="h-5 w-5 text-primary" />
                <div>
                  <h2 className="text-sm font-bold text-foreground">Riwayat Transaksi</h2>
                  <p className="text-[11px] text-muted-foreground">
                    Pesanan yang sudah dibayar — klik struk untuk mencetak ulang.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setHistoryOpen(false)}
                className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              {historyLoading ? (
                <div className="flex h-40 items-center justify-center text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <Receipt className="h-7 w-7 animate-pulse text-primary/60" />
                    <p className="text-sm font-medium">Memuat riwayat...</p>
                  </div>
                </div>
              ) : historyData.length === 0 ? (
                <div className="flex h-40 flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 p-6 text-center text-muted-foreground">
                  <History className="mb-2 h-7 w-7 opacity-40" />
                  <p className="text-sm font-medium text-foreground">Belum ada transaksi</p>
                  <p className="text-xs">Transaksi yang sudah dibayar akan tampil di sini.</p>
                </div>
              ) : (
                <ul className="space-y-2.5">
                  {historyData.map((order) => (
                    <li
                      key={order.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/70 bg-background/60 p-3.5 shadow-subtle"
                    >
                      <button
                        onClick={() => handleReprint(order.id)}
                        disabled={reprintLoading === order.id}
                        className="flex min-w-0 flex-1 items-center gap-3 text-left"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
                          <Receipt className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-foreground">
                            {order.invoiceNumber}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {customerNameOr('Pelanggan', order.customerName)} •{' '}
                            {order.tableNumber ?? 'Tanpa meja'} • {formatRupiah(order.grandTotal)}
                          </p>
                        </div>
                      </button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleReprint(order.id)}
                        disabled={reprintLoading === order.id}
                        className="shrink-0"
                      >
                        <CreditCard className="h-3.5 w-3.5" />
                        {reprintLoading === order.id ? 'Memuat...' : 'Struk'}
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {reprint && <ReceiptModal order={reprint} onClose={() => setReprint(null)} />}
      </div>
    </div>
  )
}

/* ============================================================
   Panel ORDER DETAIL — order baru (keranjang belum di-open-bill)
   ============================================================ */
interface NewOrderDetailProps {
  items: ReturnType<typeof useCartStore.getState>['items']
  tables: CafeTable[]
  selectedTable: number | null
  currentTableObj: CafeTable | undefined
  cartSubtotal: number
  cartItemCount: number
  customerName: string
  setCustomerName: (v: string) => void
  customerGender: CustomerGender | null
  setCustomerGender: (v: CustomerGender | null) => void
  onSelectTable: (id: number) => void
  onIncrease: (id: string) => void
  onDecrease: (id: string) => void
  onSetNotes: (id: string, notes: string) => void
  onRemoveItem: (id: string) => void
  onClearCart: () => void
  opening: boolean
  onOpenBill: () => void
  onPay: () => void
}

function NewOrderDetail({
  items,
  tables,
  selectedTable,
  currentTableObj,
  cartSubtotal,
  cartItemCount,
  customerName,
  setCustomerName,
  customerGender,
  setCustomerGender,
  onSelectTable,
  onIncrease,
  onDecrease,
  onSetNotes,
  onRemoveItem,
  onClearCart,
  opening,
  onOpenBill,
  onPay,
}: NewOrderDetailProps) {
  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-y-auto pr-1">
      {/* Section: Customer */}
      <SectionTitle icon={<User className="h-4 w-4" />} title="Customer" />

      <div className="rounded-2xl border border-border/70 bg-background/60 p-3.5 shadow-subtle">
        <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          Nama Pelanggan
        </label>
        <Input
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          placeholder="Nama pelanggan (opsional)"
          className="h-10 bg-card text-sm"
        />
        <label className="mb-1.5 mt-3 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          Gender Pelanggan
        </label>
        <div className="grid grid-cols-2 gap-2.5">
          {(
            [
              { v: 'L' as CustomerGender, label: '👨 Laki-laki' },
              { v: 'P' as CustomerGender, label: '👩 Perempuan' },
            ]
          ).map((opt) => (
            <button
              key={opt.v}
              type="button"
              onClick={() => setCustomerGender(opt.v)}
              className={cn(
                'flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-all duration-150 active:scale-95',
                customerGender === opt.v
                  ? 'border-primary bg-primary text-primary-foreground shadow-xs'
                  : 'border-border/80 bg-background text-foreground hover:bg-accent',
              )}
            >
              <span>{opt.label}</span>
              {customerGender === opt.v && <CheckCircle2 className="h-4 w-4 text-primary-foreground" />}
            </button>
          ))}
        </div>
      </div>

      {/* Section: Order Info */}
      <SectionTitle icon={<Receipt className="h-4 w-4" />} title="Order Info" />
      <div className="grid grid-cols-3 gap-2">
        <InfoBox label="Order ID" value="—" />
        <InfoBox label="Invoice" value="—" />
        <InfoBox label="Nomor Meja" value={currentTableObj ? currentTableObj.tableNumber.replace(/\D/g, '') : '—'} />
      </div>

      {/* Section: Ordered Items */}
      <SectionTitle
        icon={<ShoppingBag className="h-4 w-4" />}
        title="Ordered Items"
        badge={cartItemCount > 0 ? cartItemCount : undefined}
        rightAction={
          items.length > 0 ? (
            <button
              onClick={onClearCart}
              className="text-xs font-medium text-muted-foreground hover:text-destructive transition-colors"
            >
              Kosongkan
            </button>
          ) : undefined
        }
      />

      <div className="min-h-0 space-y-2.5">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/70 p-6 text-center text-muted-foreground">
            <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-muted/60 text-muted-foreground/60">
              <ShoppingBag className="h-6 w-6" />
            </div>
            <p className="text-sm font-semibold text-foreground">Belum ada item</p>
            <p className="text-xs text-muted-foreground max-w-[220px] mt-0.5">
              Pilih menu di katalog untuk menambahkan pesanan.
            </p>
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl border border-border/70 bg-background/60 p-3 shadow-subtle"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground leading-tight">
                    {item.product.name}
                  </p>
                  <p className="text-xs font-medium text-muted-foreground tabular-nums mt-0.5">
                    {formatRupiah(item.product.price)} x {item.quantity}
                  </p>
                  {item.notes && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                        <SlidersHorizontal className="h-3 w-3" />
                        {item.notes}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <div className="flex items-center gap-1 rounded-lg border border-border/80 bg-card p-0.5">
                    <button
                      onClick={() => onDecrease(item.id)}
                      className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-muted text-foreground transition-colors active:scale-90"
                      aria-label="Kurangi kuantiti"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="w-6 text-center text-xs font-bold tabular-nums text-foreground">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => onIncrease(item.id)}
                      className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-muted text-foreground transition-colors active:scale-90"
                      aria-label="Tambah kuantiti"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                  <p className="text-xs font-bold text-foreground tabular-nums">
                    {formatRupiah(item.product.price * item.quantity)}
                  </p>
                </div>
              </div>

              <div className="mt-2 flex items-center justify-between gap-1.5 rounded-lg bg-secondary/50 px-2 py-1">
                <div className="flex flex-1 items-center gap-1.5 min-w-0">
                  <StickyNote className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
                  <input
                    value={item.notes ?? ''}
                    onChange={(e) => onSetNotes(item.id, e.target.value)}
                    placeholder="Edit catatan..."
                    className="w-full bg-transparent text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
                  />
                </div>
                <button
                  onClick={() => onRemoveItem(item.id)}
                  className="p-1 text-muted-foreground/60 hover:text-destructive transition-colors"
                  title="Hapus baris ini"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Section: Table Detail */}
      <SectionTitle icon={<Utensils className="h-4 w-4" />} title="Table Detail" />
      <div className="rounded-2xl border border-border/70 bg-background/60 p-3.5 shadow-subtle">
        <div className="grid grid-cols-5 gap-2">
          {tables.map((table) => {
            const occupied = table.isOccupied
            const active = selectedTable === table.id
            return (
              <button
                key={table.id}
                onClick={() => !occupied && onSelectTable(table.id)}
                disabled={occupied}
                title={
                  occupied
                    ? `${table.tableNumber} (Terisi)`
                    : table.tableNumber
                }
                className={cn(
                  'relative flex h-11 flex-col items-center justify-center rounded-xl border text-xs font-bold transition-all duration-150 active:scale-95',
                  active
                    ? 'border-primary bg-primary text-primary-foreground shadow-xs ring-2 ring-primary/20'
                    : occupied
                      ? 'border-border/60 bg-muted/40 text-muted-foreground/60 cursor-not-allowed'
                      : 'border-border/80 bg-background hover:border-primary/50 text-foreground',
                )}
              >
                <span className="tabular-nums">{table.tableNumber.replace(/\D/g, '')}</span>
                {occupied && (
                  <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-amber-500" />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Section: Payment Summary */}
      <SectionTitle icon={<Banknote className="h-4 w-4" />} title="Payment Summary" />
      <div className="rounded-2xl border border-border/70 bg-background/60 p-3.5 shadow-subtle">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground font-medium">Subtotal</span>
          <span className="text-foreground font-semibold tabular-nums">
            {formatRupiah(cartSubtotal)}
          </span>
        </div>
        <div className="mt-2 flex items-center justify-between border-t border-border/70 pt-2.5">
          <span className="text-base font-bold text-foreground">Grand Total</span>
          <span className="text-xl font-black text-primary tabular-nums">
            {formatRupiah(cartSubtotal)}
          </span>
        </div>
      </div>

      {/* Aksi */}
      <div className="sticky bottom-0 space-y-2.5 bg-card pb-1 pt-2">
        <Button
          className="w-full h-11 text-sm font-bold shadow-sm"
          disabled={items.length === 0 || !selectedTable || opening}
          onClick={onOpenBill}
        >
          <Receipt className="h-4 w-4" />
          {opening ? 'Menyimpan ke Meja...' : 'Open Bill (Simpan Pesanan)'}
        </Button>
        <Button
          variant="secondary"
          className="w-full h-11 text-sm font-bold shadow-sm"
          disabled={items.length === 0 || !selectedTable}
          onClick={onPay}
        >
          <Banknote className="h-4 w-4" />
          Langsung Bayar
        </Button>
        {!selectedTable && items.length > 0 && (
          <p className="text-center text-[11px] font-medium text-amber-600">
            ⚠️ Silakan klik nomor meja pada Tab Order Detail di bawah terlebih dahulu.
          </p>
        )}
      </div>
    </div>
  )
}

/* ============================================================
   Panel ORDER DETAIL — order OPEN_BILL yang sedang dibuka ulang
   ============================================================ */
interface OpenOrderDetailProps {
  order: OrderDetail | null
  loading: boolean
  customerName: string
  setCustomerName: (v: string) => void
  customerGender: CustomerGender | null
  setCustomerGender: (v: CustomerGender | null) => void
  onNewOrder: () => void
  onPay: () => void
  submittingPayment: boolean
}

function OpenOrderDetail({
  order,
  loading,
  customerName,
  setCustomerName,
  customerGender,
  setCustomerGender,
  onNewOrder,
  onPay,
  submittingPayment,
}: OpenOrderDetailProps) {
  if (loading || !order) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
        <Receipt className="h-8 w-8 animate-pulse text-primary/60" />
        <p className="text-sm font-medium">Memuat detail pesanan...</p>
      </div>
    )
  }

  const itemCount = order.items.reduce((s, i) => s + i.quantity, 0)

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-y-auto pr-1">
      {/* Header panel */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-bold text-foreground">Order #{order.id}</h2>
          <p className="text-[11px] text-muted-foreground">{order.invoiceNumber}</p>
        </div>
        <Button size="sm" variant="ghost" onClick={onNewOrder} className="text-muted-foreground">
          <Plus className="h-4 w-4" />
          Pesanan Baru
        </Button>
      </div>

      {/* Section: Customer */}
      <SectionTitle icon={<User className="h-4 w-4" />} title="Customer" />
      <div className="rounded-2xl border border-border/70 bg-background/60 p-3.5 shadow-subtle">
        <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          Nama Pelanggan
        </label>
        <Input
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          placeholder="Nama pelanggan"
          className="h-10 bg-card text-sm"
        />
        <label className="mb-1.5 mt-3 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          Gender Pelanggan
        </label>
        <div className="grid grid-cols-2 gap-2.5">
          {(
            [
              { v: 'L' as CustomerGender, label: '👨 Laki-laki' },
              { v: 'P' as CustomerGender, label: '👩 Perempuan' },
            ]
          ).map((opt) => (
            <button
              key={opt.v}
              type="button"
              onClick={() => setCustomerGender(opt.v)}
              className={cn(
                'flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-all duration-150 active:scale-95',
                customerGender === opt.v
                  ? 'border-primary bg-primary text-primary-foreground shadow-xs'
                  : 'border-border/80 bg-background text-foreground hover:bg-accent',
              )}
            >
              <span>{opt.label}</span>
              {customerGender === opt.v && <CheckCircle2 className="h-4 w-4 text-primary-foreground" />}
            </button>
          ))}
        </div>
      </div>

      {/* Section: Order Info */}
      <SectionTitle icon={<Receipt className="h-4 w-4" />} title="Order Info" />
      <div className="grid grid-cols-3 gap-2">
        <InfoBox label="Order ID" value={String(order.id)} />
        <InfoBox label="Invoice" value={order.invoiceNumber} />
        <InfoBox label="Nomor Meja" value={order.tableNumber?.replace(/\D/g, '') ?? '—'} />
      </div>

      {/* Section: Ordered Items */}
      <SectionTitle
        icon={<ShoppingBag className="h-4 w-4" />}
        title="Ordered Items"
        badge={itemCount}
      />
      <div className="space-y-2.5">
        {order.items.map((item, idx) => (
          <div
            key={idx}
            className="flex items-start justify-between gap-2 rounded-2xl border border-border/70 bg-background/60 p-3 shadow-subtle"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">{item.productName}</p>
              <p className="text-xs font-medium text-muted-foreground tabular-nums mt-0.5">
                {item.quantity} x {formatRupiah(item.unitPrice)}
              </p>
              {item.notes && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                    <SlidersHorizontal className="h-3 w-3" />
                    {item.notes}
                  </span>
                </div>
              )}
            </div>
            <p className="shrink-0 text-sm font-bold text-foreground tabular-nums">
              {formatRupiah(item.subtotal)}
            </p>
          </div>
        ))}
      </div>

      {/* Section: Table Detail */}
      <SectionTitle icon={<Utensils className="h-4 w-4" />} title="Table Detail" />
      <div className="rounded-2xl border border-border/70 bg-background/60 p-3.5 shadow-subtle">
        <InfoBox label="Nomor Meja" value={order.tableNumber ?? '—'} />
      </div>

      {/* Section: Payment Summary */}
      <SectionTitle icon={<Banknote className="h-4 w-4" />} title="Payment Summary" />
      <div className="rounded-2xl border border-border/70 bg-background/60 p-3.5 shadow-subtle">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground font-medium">Subtotal</span>
          <span className="text-foreground font-semibold tabular-nums">{formatRupiah(order.subtotal)}</span>
        </div>
        <div className="mt-2 flex items-center justify-between border-t border-border/70 pt-2.5">
          <span className="text-base font-bold text-foreground">Grand Total</span>
          <span className="text-xl font-black text-primary tabular-nums">
            {formatRupiah(order.grandTotal)}
          </span>
        </div>
      </div>

      {/* Aksi */}
      <div className="sticky bottom-0 space-y-2.5 bg-card pb-1 pt-2">
        <Button
          className="w-full h-11 text-sm font-bold shadow-sm"
          disabled={!customerGender || submittingPayment}
          onClick={onPay}
        >
          <Banknote className="h-4 w-4" />
          {submittingPayment ? 'Memproses...' : 'Bayar Sekarang'}
        </Button>
        {!customerGender && (
          <p className="text-center text-[11px] font-medium text-amber-600">
            Pilih gender pelanggan (P / L) untuk melanjutkan pembayaran.
          </p>
        )}
      </div>
    </div>
  )
}

/* ============================================================
   Helper komponen kecil
   ============================================================ */
function SectionTitle({
  icon,
  title,
  badge,
  rightAction,
}: {
  icon: React.ReactNode
  title: string
  badge?: number
  rightAction?: React.ReactNode
}) {
  return (
    <div className="mb-1 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {icon}
        </span>
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{title}</h3>
        {badge && badge > 0 && (
          <span className="rounded-full bg-primary px-2 py-0.2 text-[11px] font-bold text-primary-foreground tabular-nums">
            {badge}
          </span>
        )}
      </div>
      {rightAction}
    </div>
  )
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/70 bg-background/40 px-3 py-2.5">
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-0.5 truncate text-sm font-bold text-foreground tabular-nums">{value}</p>
    </div>
  )
}
