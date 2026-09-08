import { useEffect, useMemo, useState } from 'react'
import {
  CheckCircle2,
  Coffee,
  Receipt,
  Search,
  ShoppingBag,
  UtensilsCrossed,
  X,
} from 'lucide-react'
import type { CustomerGender, OrderType, Product } from '@/api/client'
import {
  checkoutRequest,
  fetchActiveOrders,
  fetchCategories,
  fetchProducts,
  openBillRequest,
} from '@/api/client'
import type { Category, OpenBillItemInput, OrderSummary } from '@/api/client'
import type {
  AvailabilityFilter,
  CategoryFilter,
  SortOption,
} from '@/components/CategoryFilterBar'
import { useAuthStore } from '@/store/authStore'
import { useCartStore } from '@/store/cartStore'
import { formatRupiah } from '@/utils/format'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import PaymentModal from '@/components/PaymentModal'
import ReceiptModal from '@/components/ReceiptModal'
import CustomItemModal from '@/components/CustomItemModal'
import OrderHistoryDrawer from '@/components/OrderHistoryDrawer'
import NavigationRail from '@/components/NavigationRail'
import { Section } from '@/components/ui/Section'
import ActiveOrdersLine from '@/components/ActiveOrdersLine'
import CategoryFilterBar from '@/components/CategoryFilterBar'
import ProductCatalogGrid from '@/components/ProductCatalogGrid'
import OrderDetailsPanel from '@/components/OrderDetailsPanel'
import type { CheckoutResult } from '@/api/client'

export default function POS() {
  const { user } = useAuthStore()
  const { items, increase, decrease, addItem, setNotes, removeItem, clear } = useCartStore()

  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [activeOrders, setActiveOrders] = useState<OrderSummary[]>([])
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('all')
  const [search, setSearch] = useState('')
  const [availabilityFilter, setAvailabilityFilter] = useState<AvailabilityFilter>('all')
  const [sortOption, setSortOption] = useState<SortOption>('default')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [feedbackError, setFeedbackError] = useState(false)

  // Drawer keranjang di mobile/tablet
  const [mobileCartOpen, setMobileCartOpen] = useState(false)

  // Custom Item Modal state
  const [customModalProduct, setCustomModalProduct] = useState<Product | null>(null)
  const [customModalOpen, setCustomModalOpen] = useState(false)

  // ---- ORDER DETAIL panel state ----
  // mode: 'new' = pesanan baru; 'open' = viewing open bill lama
  const [panelMode, setPanelMode] = useState<'new' | 'open'>('new')
  const [openOrder, setOpenOrder] = useState<OrderSummary | null>(null)
  const [orderType, setOrderType] = useState<OrderType>('DINE_IN')

  // Field customer (diisi di panel)
  const [customerName, setCustomerName] = useState('')
  const [customerGender, setCustomerGender] = useState<CustomerGender | null>(null)

  // Payment / receipt / history state
  const [payOpen, setPayOpen] = useState(false)
  const [submittingPayment, setSubmittingPayment] = useState(false)
  const [receipt, setReceipt] = useState<CheckoutResult | null>(null)
  // Drawer Order History (Task 1.3.10) — riwayat PAID tanpa reload layar kasir
  const [historyOpen, setHistoryOpen] = useState(false)

  async function loadData() {
    const [productData, categoryData, orderData] = await Promise.all([
      fetchProducts(),
      fetchCategories(),
      fetchActiveOrders(),
    ])
    setProducts(productData)
    setCategories(categoryData)
    setActiveOrders(orderData)
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

  // Filtering & Sorting yang canggih (Grid produk itu sendiri di Task 1.3.6)
  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase()
    const result = products.filter((p) => {
      if (activeCategory === 'recommended' && !p.isRecommended) return false
      if (activeCategory === 'best-seller' && !p.isBestSeller) return false
      if (typeof activeCategory === 'number' && p.categoryId !== activeCategory) return false
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

  // Klik kartu ACTIVE ORDERS -> viewing tiket lama (pesanan tak bisa diedit penuh;
  // hanya gender/customer utk checkout — back office menangani item).
  function handleViewActiveOrder(orderId: number) {
    const summary = activeOrders.find((o) => o.id === orderId)
    if (!summary) {
      showFeedback('Pesanan tidak ditemukan.', true)
      return
    }
    setPanelMode('open')
    setOpenOrder(summary)
    setOrderType(summary.orderType)
    setCustomerName(summary.customerName ?? '')
    setCustomerGender(summary.customerGender)
    // Bersihkan keranjang agar panel mode open menampilkan tiket lama, bukan cart.
    clear()
  }

  // Kembali ke pesanan baru (reset panel & keranjang)
  function handleNewOrder() {
    setPanelMode('new')
    setOpenOrder(null)
    setOrderType('DINE_IN')
    setCustomerName('')
    setCustomerGender(null)
    clear()
  }

  // ---- Save Open Bill (simpan order baru dari keranjang) ----
  async function handleSaveOpenBill() {
    if (!customerName.trim()) {
      showFeedback('Nama pelanggan wajib diisi sebelum menyimpan.', true)
      return
    }
    if (items.length === 0) {
      showFeedback('Pesanan minimal berisi 1 item.', true)
      return
    }
    setSaving(true)
    setFeedback(null)
    try {
      const payload: OpenBillItemInput[] = items.map((i) => ({
        productId: i.product.id,
        quantity: i.quantity,
        notes: i.notes?.trim() ? i.notes : undefined,
      }))
      const saved = await openBillRequest({
        orderType,
        customerName: customerName.trim(),
        items: payload,
      })
      clear() // keranjang reset otomatis setelah sukses
      await loadData() // refresh: Active Orders Line bertambah
      showFeedback(`Pesanan ${saved.invoiceNumber} disimpan ke Active Orders.`)
      setMobileCartOpen(false)
    } catch {
      showFeedback('Gagal menyimpan pesanan. Silakan coba lagi.', true)
    } finally {
      setSaving(false)
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
        if (!customerName.trim()) {
          showFeedback('Nama pelanggan wajib diisi.', true)
          setSubmittingPayment(false)
          return
        }
        if (items.length === 0) {
          showFeedback('Pesanan minimal berisi 1 item.', true)
          setSubmittingPayment(false)
          return
        }
        const itemsPayload: OpenBillItemInput[] = items.map((i) => ({
          productId: i.product.id,
          quantity: i.quantity,
          notes: i.notes?.trim() ? i.notes : undefined,
        }))
        const created = await openBillRequest({
          orderType,
          customerName: customerName.trim(),
          items: itemsPayload,
        })
        orderId = created.id
      }

      const done = await checkoutRequest(orderId, {
        customerGender: payload.customerGender,
        payment: payload.payment,
      })
      setPayOpen(false)
      setOpenOrder(null)
      setPanelMode('new')
      setOrderType('DINE_IN')
      setCustomerName('')
      setCustomerGender(null)
      clear()
      await loadData() // refresh: kartu OPEN_BILL hilang, paid history bertambah
      setReceipt(done) // tampilkan pratinjau struk setelah transaksi sukses
    } catch {
      showFeedback('Gagal memproses pembayaran. Silakan coba lagi.', true)
    } finally {
      setSubmittingPayment(false)
    }
  }

  // ---- Lock Register (kunci sesi kasir; implementasi penuh di task shift) ----
  function lockRegister() {
    showFeedback('Lock Register belum tersedia di fase ini.')
  }

  const isNewPanel = panelMode === 'new'

  return (
    <div className="flex h-svh bg-background selection:bg-primary/20 selection:text-primary">
      {/* ===== Zone 1: Slim Left Navigation Rail ===== */}
      <NavigationRail onOpenHistory={() => setHistoryOpen(true)} onLockRegister={lockRegister} />

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

          <div className="flex items-center gap-2">
            <div className="hidden items-center rounded-full border border-border/80 bg-secondary/50 px-3.5 py-1 text-xs font-medium text-muted-foreground md:flex">
              <span className="flex items-center gap-1 text-primary">
                <span className="h-2 w-2 rounded-full bg-primary" />
                {activeOrders.length} Active Orders
              </span>
            </div>
            {/* Mobile Cart Button trigger in Header */}
            <button
              onClick={() => setMobileCartOpen(true)}
              className="relative flex h-11 items-center gap-2 rounded-xl border border-border/80 bg-card px-3 text-xs font-bold text-foreground lg:hidden"
            >
              <ShoppingBag className="h-4 w-4 text-primary" />
              <span>Cart</span>
              {cartItemCount > 0 && (
                <span className="rounded-full bg-primary px-1.5 py-0.2 text-[10px] font-bold text-primary-foreground tabular-nums">
                  {cartItemCount}
                </span>
              )}
            </button>
          </div>
        </header>

      {/* ===== Main Content Area ===== */}
      <div className="grid flex-1 grid-cols-1 gap-5 overflow-hidden p-4 sm:p-5 lg:grid-cols-[1fr_400px]">
        {/* ===== Left Column: Order Queue & Menu Catalog Sections ===== */}
        <div className="flex min-h-0 flex-col gap-5">
          {/* SECTION 1 — Order Queue (open bills waiting for payment) */}
          <ActiveOrdersLine
            orders={activeOrders}
            activeOrderId={panelMode === 'open' ? openOrder?.id ?? null : null}
            onSelect={handleViewActiveOrder}
          />

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

          {/* SECTION 2 — Menu Catalog: full filter toolbar lives here */}
          <Section
            icon={UtensilsCrossed}
            title="Menu Catalog"
            subtitle="All items across the menu"
            bodyClassName="min-h-0 flex-1"
            className="flex-1"
          >
            <div className="flex min-h-0 flex-1 flex-col">
              {/* Toolbar filter katalog: search, pills, sort/status, popover Categories */}
              <CategoryFilterBar
                categories={categories}
                products={products}
                activeCategory={activeCategory}
                onSelectCategory={setActiveCategory}
                search={search}
                onSearchChange={setSearch}
                availabilityFilter={availabilityFilter}
                onAvailabilityChange={setAvailabilityFilter}
                sortOption={sortOption}
                onSortChange={setSortOption}
              />

              {/* Grid produk + section headers kategori */}
              <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                {loading ? (
                  <div className="flex h-64 flex-col items-center justify-center gap-2 text-muted-foreground">
                    <Coffee className="h-8 w-8 animate-bounce text-primary/60" />
                    <p className="text-sm font-medium">Loading menu...</p>
                  </div>
                ) : filteredProducts.length === 0 ? (
                  <div className="flex h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 p-8 text-center text-muted-foreground">
                    <Search className="mb-2 h-8 w-8 opacity-40" />
                    <p className="text-sm font-medium text-foreground">No menu found</p>
                    <p className="text-xs">Try a different keyword or change the status filter.</p>
                  </div>
                ) : (
                  <ProductCatalogGrid
                    products={filteredProducts}
                    activeCategory={activeCategory}
                    onSelect={handleOpenCustom}
                  />
                )}
              </div>
            </div>
          </Section>
        </div>

        {/* ===== Right Column (Desktop): ORDER DETAIL Panel (Zone 3, Task 1.3.8) ===== */}
        <Card className="hidden lg:flex min-h-0 flex-col overflow-hidden border-border/80 bg-card shadow-card">
          <CardContent className="flex h-full min-h-0 flex-col p-4">
            <OrderDetailsPanel
              mode={panelMode}
              orderNumber={isNewPanel ? null : openOrder?.id ?? null}
              createdAt={isNewPanel ? null : openOrder?.createdAt ?? null}
              items={items}
              customerName={customerName}
              setCustomerName={setCustomerName}
              customerGender={customerGender}
              setCustomerGender={setCustomerGender}
              orderType={orderType}
              setOrderType={setOrderType}
              onIncrease={increase}
              onDecrease={decrease}
              onSetNotes={setNotes}
              onRemoveItem={removeItem}
              onClearCart={clear}
              onNewOrder={handleNewOrder}
              onPay={() => setPayOpen(true)}
              onSaveOpenBill={handleSaveOpenBill}
              saving={saving}
              validationError={null}
            />
          </CardContent>
        </Card>
      </div>

      {/* ===== Floating Mobile/Tablet Cart Bar (Bottom) ===== */}
      <div className="fixed bottom-0 left-0 right-0 z-30 flex items-center justify-between border-t border-border/80 bg-card/95 px-4 py-3 backdrop-blur-md shadow-modal lg:hidden">
        <div>
          <span className="text-xs font-bold text-muted-foreground">
            {customerName.trim() || 'No name yet'}
          </span>
          <p className="text-base font-black text-primary tabular-nums">
            {formatRupiah(cartSubtotal)}
          </p>
        </div>

        <Button
          onClick={() => setMobileCartOpen(true)}
          className="h-11 px-5 font-bold shadow-sm"
        >
          <ShoppingBag className="h-4 w-4" />
          View Cart
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
                <h2 className="text-base font-bold text-foreground">Order Details</h2>
              </div>
              <button
                onClick={() => setMobileCartOpen(false)}
                className="flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <OrderDetailsPanel
                mode={panelMode}
                orderNumber={isNewPanel ? null : openOrder?.id ?? null}
                createdAt={isNewPanel ? null : openOrder?.createdAt ?? null}
                items={items}
                customerName={customerName}
                setCustomerName={setCustomerName}
                customerGender={customerGender}
                setCustomerGender={setCustomerGender}
                orderType={orderType}
                setOrderType={setOrderType}
                onIncrease={increase}
                onDecrease={decrease}
                onSetNotes={setNotes}
                onRemoveItem={removeItem}
                onClearCart={clear}
                onNewOrder={handleNewOrder}
                onPay={() => setPayOpen(true)}
                onSaveOpenBill={handleSaveOpenBill}
                saving={saving}
                validationError={null}
              />
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
          grandTotal={cartSubtotal}
          itemCount={cartItemCount}
          tableNumber={null}
          gender={customerGender}
          submitting={submittingPayment}
          onSubmit={handleCheckout}
          onClose={() => setPayOpen(false)}
        />
      )}

      {receipt && <ReceiptModal order={receipt} onClose={() => setReceipt(null)} />}

      {/* Drawer Order History (Task 1.3.10) — slide-over kanan */}
      <OrderHistoryDrawer open={historyOpen} onClose={() => setHistoryOpen(false)} />
      </div>
    </div>
  )
}
