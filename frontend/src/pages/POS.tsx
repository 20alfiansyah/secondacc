import { useEffect, useMemo, useState } from 'react'
import Icon from '@/components/ui/Icon'
import TopBar from '@/components/TopBar'
import {
  checkoutRequest,
  fetchActiveOrders,
  fetchCategories,
  fetchProducts,
  openBillRequest,
} from '@/api/client'
import type {
  Category,
  CustomerGender,
  OpenBillItemInput,
  OrderSummary,
  OrderType,
  Product,
} from '@/api/client'
import type { CategoryFilter, SortOption } from '@/components/CategoryFilterBar'
import { useCartStore } from '@/store/cartStore'
import { formatRupiah } from '@/utils/format'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import PaymentModal from '@/components/PaymentModal'
import ReceiptModal from '@/components/ReceiptModal'
import CustomItemModal from '@/components/CustomItemModal'
import OrderHistoryDrawer from '@/components/OrderHistoryDrawer'
import NavigationRail, { SIDEBAR_TOGGLE_EVENT } from '@/components/NavigationRail'
import ActiveOrdersLine from '@/components/ActiveOrdersLine'
import CategoryFilterBar from '@/components/CategoryFilterBar'
import ProductCatalogGrid from '@/components/ProductCatalogGrid'
import OrderDetailsPanel from '@/components/OrderDetailsPanel'
import type { CheckoutResult } from '@/api/client'

const PANEL_TOGGLE_EVENT = 'cafe_pos:toggle-panel'

export default function POS() {
  const { items, increase, decrease, addItem, setNotes, removeItem, clear } = useCartStore()

  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [activeOrders, setActiveOrders] = useState<OrderSummary[]>([])
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('all')
  const [search, setSearch] = useState('')
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

  // Panel kanan bisa diciutkan jadi rail vertikal (persist localStorage)
  const [panelCollapsed, setPanelCollapsed] = useState(() => {
    try {
      return localStorage.getItem('cafe_pos_panel_collapsed') === 'true'
    } catch {
      return false
    }
  })

  function togglePanelCollapsed() {
    setPanelCollapsed((prev) => {
      const next = !prev
      try {
        localStorage.setItem('cafe_pos_panel_collapsed', String(next))
      } catch {
        // ignore
      }
      return next
    })
  }

  // Alt+O dari keyboard shortcut men-trigger event ini.
  useEffect(() => {
    function onPanelToggle() {
      togglePanelCollapsed()
    }
    window.addEventListener(PANEL_TOGGLE_EVENT, onPanelToggle)
    return () => window.removeEventListener(PANEL_TOGGLE_EVENT, onPanelToggle)
  }, [])

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

  // Collapse tray MENU CATALOG (spec screen1: tombol chevron di header band).
  const [catalogOpen, setCatalogOpen] = useState(true)
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

  // Keyboard shortcuts spec screen1: Alt+S toggle sidebar, Alt+O toggle panel order.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (!e.altKey || e.ctrlKey || e.metaKey) return
      if (e.key === 's' || e.key === 'S') {
        e.preventDefault()
        window.dispatchEvent(new CustomEvent(SIDEBAR_TOGGLE_EVENT))
      } else if (e.key === 'o' || e.key === 'O') {
        e.preventDefault()
        window.dispatchEvent(new CustomEvent(PANEL_TOGGLE_EVENT))
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  // Filtering & Sorting — pills kategori + search + sort (spec Stitch).
  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase()
    const result = products.filter((p) => {
      if (activeCategory === 'recommended' && !p.isRecommended) return false
      if (activeCategory === 'best-seller' && !p.isBestSeller) return false
      if (typeof activeCategory === 'number' && p.categoryId !== activeCategory) return false
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
  }, [products, activeCategory, sortOption, search])

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
      showFeedback('Order not found.', true)
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
      showFeedback('Customer name is required before saving.', true)
      return
    }
    if (items.length === 0) {
      showFeedback('Order must contain at least 1 item.', true)
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
      showFeedback(`Order ${saved.invoiceNumber} saved to Active Orders.`)
      setMobileCartOpen(false)
    } catch {
      showFeedback('Failed to save the order. Please try again.', true)
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
          showFeedback('Customer name is required.', true)
          setSubmittingPayment(false)
          return
        }
        if (items.length === 0) {
          showFeedback('Order must contain at least 1 item.', true)
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
      showFeedback('Failed to process the payment. Please try again.', true)
    } finally {
      setSubmittingPayment(false)
    }
  }

  // ---- Lock Register (kunci sesi kasir; implementasi penuh di task shift) ----
  function lockRegister() {
    showFeedback('Lock Register is not available in this phase.')
  }

  const isNewPanel = panelMode === 'new'

  return (
    <div className="flex h-svh bg-[#F8FAFC] text-slate-900 selection:bg-[#65AF92]/30 selection:text-[#2d5258]">
      {/* ===== Zone 1: Collapsible sidebar (Stitch screen1) ===== */}
      <NavigationRail
        onOpenHistory={() => setHistoryOpen(true)}
        onLockRegister={lockRegister}
        onFeatureNotice={(msg) => showFeedback(msg)}
      />

      {/* ===== Zone 2: Scrollable main content ===== */}
      <main className="flex min-w-0 flex-1 flex-col space-y-4 overflow-y-auto bg-[#F8FAFC] p-4">
        <TopBar page="Register" />

        {/* Feedback Banner */}
        {feedback && (
          <div
            className={cn(
              'flex flex-shrink-0 items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium shadow-xs',
              feedbackError
                ? 'border-destructive/20 bg-destructive/10 text-destructive'
                : 'border-[#b9e2d3] bg-[#edf7f3] text-[#2d5258]',
            )}
          >
            <Icon name={feedbackError ? 'error' : 'check_circle'} className="shrink-0 text-base" />
            <span>{feedback}</span>
          </div>
        )}

        <ActiveOrdersLine
          orders={activeOrders}
          activeOrderId={panelMode === 'open' ? openOrder?.id ?? null : null}
          onSelect={handleViewActiveOrder}
        />

        {/* ===== Menu Catalog section (flex-1, grid scroll di dalam) ===== */}
        <section className="flex min-h-0 flex-1 flex-col space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          {/* Header band */}
          <div className="flex flex-shrink-0 items-center justify-between pb-1">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-[#447C84]">
                  restaurant_menu
                </span>
                <span className="font-display text-xs font-bold uppercase tracking-wider text-slate-900">
                  MENU CATALOG
                </span>
              </div>
              <div className="hidden h-4 w-px bg-slate-200 md:block" />
              <span className="hidden text-[11px] font-medium text-slate-500 md:inline-block">
                Quick selection &amp; fulfillment
              </span>
            </div>
            <button
              type="button"
              onClick={() => setCatalogOpen((v) => !v)}
              title="Toggle Menu Catalog"
              aria-expanded={catalogOpen}
              className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg border border-slate-200 text-slate-500 shadow-xs transition active:scale-95 hover:bg-slate-100 hover:text-slate-900"
            >
              <span className="material-symbols-outlined text-[18px]">
                {catalogOpen ? 'expand_less' : 'expand_more'}
              </span>
            </button>
          </div>

          {catalogOpen && (
          <>

            {/* Toolbar band: search + kbd ⌘K + sort + pills kategori */}
            <div className="flex-shrink-0 space-y-3">
              <CategoryFilterBar
            categories={categories}
            products={products}
            activeCategory={activeCategory}
            onSelectCategory={setActiveCategory}
            search={search}
            onSearchChange={setSearch}
            sortOption={sortOption}
            onSortChange={setSortOption}
          />
            </div>


          {/* Grid produk + header per kategori */}
          <div className="min-h-0 flex-1 space-y-6 overflow-y-auto pr-1">
            {loading ? (
              <div className="flex h-64 flex-col items-center justify-center gap-2 text-slate-400">
                <Icon name="coffee" className="animate-bounce text-3xl text-[#447C84]/60" />
                <p className="text-sm font-medium">Loading menu...</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="flex h-64 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200/80 bg-slate-50/70 p-8 text-center text-slate-500">
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 shadow-xs">
                  <span className="material-symbols-outlined text-[20px] text-[#447C84]">search</span>
                </div>
                <p className="font-display text-xs font-bold text-slate-800">No menu found</p>
                <p className="text-[11px] text-slate-500">Try a different keyword or category.</p>
              </div>
            ) : (
              <ProductCatalogGrid
                products={filteredProducts}
                activeCategory={activeCategory}
                onSelect={handleOpenCustom}
              />
            )}
          </div>
          </>
          )}
        </section>
      </main>

      {/* ===== Zone 3: Right Order Panel / Collapsed Rail (Stitch screen1/2/3) ===== */}
      <aside
        className={cn(
          'relative z-20 hidden h-full flex-col border-l border-slate-200/80 bg-white lg:flex',
          panelCollapsed ? 'w-[4.25rem]' : 'w-[380px]',
        )}
      >
        {/* Floating toggle di boundary panel */}
        <button
          type="button"
          onClick={togglePanelCollapsed}
          className="group absolute -left-3 top-1/2 z-40 flex h-12 w-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-slate-200 bg-white shadow-md transition-all hover:bg-slate-50 hover:text-[#447C84]"
          title="Toggle Order Panel"
          aria-expanded={!panelCollapsed}
        >
          <Icon
            name={panelCollapsed ? 'chevron_left' : 'chevron_right'}
            className="text-[16px] text-slate-500 transition-transform group-hover:scale-110"
          />
        </button>

        {panelCollapsed ? (
          /* ---- Collapsed rail vertikal 68px (spec: w-[4.25rem]) ---- */
          <div className="flex h-full w-full select-none flex-col items-center justify-between border-l border-slate-200/80 bg-slate-50/90 py-3.5">
            <div className="flex w-full flex-col items-center gap-2.5 px-2">
              <button
                type="button"
                onClick={handleNewOrder}
                className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-[#2d5258] bg-[#447C84] text-white shadow-sm transition active:scale-95 hover:bg-[#396a71]"
                title="New Order"
              >
                <Icon name="add" className="text-lg" />
              </button>
              <div className="h-px w-7 bg-slate-200/80" />
              <div
                className={cn(
                  'w-full rounded-lg border px-2 py-1 text-center font-bold text-[11px] tabular-nums shadow-xs',
                  panelMode === 'open'
                    ? 'border-[#396a71] bg-[#447C84] text-white'
                    : 'border-slate-200 bg-slate-100 text-slate-500',
                )}
                title={panelMode === 'open' ? 'Active Ticket' : 'New Ticket'}
              >
                {panelMode === 'open' && openOrder ? `#${String(openOrder.id).padStart(3, '0')}` : 'NEW'}
              </div>
              <button
                type="button"
                onClick={togglePanelCollapsed}
                className="w-full cursor-pointer rounded-xl border border-[#b9e2d3] bg-[#edf7f3] px-1 py-2 text-center shadow-xs transition hover:bg-[#e2f2ec]"
                title={`${cartItemCount} items in current order`}
              >
                <span className="text-base font-bold leading-none tabular-nums text-[#2d5258]">
                  {cartItemCount}
                </span>
                <Icon name="shopping_bag" className="text-[13px] text-[#447C84]" />
              </button>
            </div>

            {/* Center vertical total — klik untuk expand */}
            <button
              type="button"
              onClick={togglePanelCollapsed}
              className="my-3 flex flex-1 cursor-pointer flex-col items-center justify-center gap-3 rounded-xl px-1 py-4 transition hover:bg-slate-100/90"
              title="Klik untuk rincian pesanan"
            >
              <span className="writing-mode-vertical font-display text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Order Summary
              </span>
              <span className="h-px w-4 bg-slate-300/80" />
              <span className="writing-mode-vertical text-[13px] font-bold tabular-nums tracking-tight text-[#2d5258]">
                {formatRupiah(cartSubtotal)}
              </span>
            </button>

            <div className="flex w-full flex-col items-center gap-2 px-1 pb-1">
              <button
                type="button"
                onClick={togglePanelCollapsed}
                className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl bg-[#447C84] text-white shadow-md transition active:scale-95 hover:bg-[#396a71]"
                title="Buka & Bayar Sekarang"
              >
                <Icon name="payments" className="text-lg" />
              </button>
            </div>
          </div>
        ) : (
          /* ---- Panel penuh 380px ---- */
          <div className="flex h-full min-h-0 w-full flex-col">
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
              onPay={() => setPayOpen(true)}
              onSaveOpenBill={handleSaveOpenBill}
              saving={saving}
              validationError={null}
            />
          </div>
        )}
      </aside>

      {/* ===== Floating Mobile/Tablet Cart Bar (Bottom) ===== */}
      <div className="fixed bottom-0 left-0 right-0 z-30 flex items-center justify-between border-t border-slate-200/80 bg-white/95 px-4 py-3 shadow-modal backdrop-blur-md lg:hidden">
        <div>
          <span className="text-xs font-bold text-slate-500">
            {customerName.trim() || 'No name yet'}
          </span>
          <p className="text-base font-black tabular-nums text-[#447C84]">
            {formatRupiah(cartSubtotal)}
          </p>
        </div>

        <Button onClick={() => setMobileCartOpen(true)} className="h-11 px-5 font-bold shadow-sm">
          <Icon name="shopping_bag" className="text-base" />
          View Cart
          {cartItemCount > 0 && (
            <span className="ml-1 rounded-full bg-primary-foreground/20 px-1.5 py-0.5 text-xs font-bold text-primary-foreground">
              {cartItemCount}
            </span>
          )}
        </Button>
      </div>

      {/* ===== Mobile/Tablet Panel Slide-Over Drawer Sheet ===== */}
      {mobileCartOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-sm lg:hidden animate-in fade-in duration-200">
          <div className="flex max-h-[90vh] w-full flex-col rounded-t-3xl border-t border-slate-200/80 bg-white p-5 shadow-modal animate-in slide-in-from-bottom duration-200">
            <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Icon name="receipt_long" className="text-lg text-[#447C84]" />
                <h2 className="text-base font-bold text-slate-900">Order Details</h2>
              </div>
              <button
                onClick={() => setMobileCartOpen(false)}
                className="flex h-11 w-11 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-900"
              >
                <Icon name="close" className="text-lg" />
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
      {customModalProduct && customModalOpen && (
        <CustomItemModal
          product={customModalProduct}
          onClose={() => setCustomModalOpen(false)}
          onConfirm={(notes, quantity) =>
            handleCustomConfirm(customModalProduct, { notes, quantity })
          }
        />
      )}

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
  )
}
