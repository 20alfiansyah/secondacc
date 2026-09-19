import { useEffect, useMemo, useRef, useState } from 'react'
import { useBlocker } from 'react-router-dom'

import {
  checkoutRequest,
  fetchActiveOrders,
  fetchCategories,
  fetchOrderDetail,
  fetchProducts,
  openBillRequest,
  updateOrderItemsRequest,
} from '@/api/client'
import type {
  Category,
  CheckoutInput,
  CheckoutResult,
  CustomerGender,
  OpenBillItemInput,
  OrderSummary,
  OrderType,
  Product,
  UpdateOrderItemsResult,
} from '@/api/client'
import { useAuthStore } from '@/store/authStore'
import { useCartStore, type CartItem } from '@/store/cartStore'
import { formatOrderLabel, formatRupiah } from '@/utils/format'
import { cn } from '@/lib/utils'

import Icon from '@/components/ui/Icon'
import { Button } from '@/components/ui/button'
import EmptyState from '@/components/ui/EmptyState'
import ActiveOrdersLine from '@/components/ActiveOrdersLine'
import CategoryFilterBar, { type CategoryFilter, type SortOption } from '@/components/CategoryFilterBar'
import CustomItemModal from '@/components/CustomItemModal'
import MobileNav from '@/components/MobileNav'
import NavigationRail, { SIDEBAR_TOGGLE_EVENT } from '@/components/NavigationRail'
import OrderDetailsPanel from '@/components/OrderDetailsPanel'
import OrderHistoryDrawer from '@/components/OrderHistoryDrawer'
import PaymentModal from '@/components/PaymentModal'
import ProductCatalogGrid from '@/components/ProductCatalogGrid'
import ReceiptModal from '@/components/ReceiptModal'
import TopBar from '@/components/TopBar'
import UnsavedChangesModal from '@/components/UnsavedChangesModal'
const PANEL_TOGGLE_EVENT = 'cafe_pos:toggle-panel'
/** Persistensi collapsed/expanded panel order kanan. */
const PANEL_COLLAPSED_KEY = 'cafe_pos_panel_collapsed'

export default function POS() {
  const { items, increase, decrease, addItem, setNotes, setQuantity, removeItem, clear } = useCartStore()
  const logout = useAuthStore((s) => s.logout)

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
  // Timer banner feedback — dibatalkan sebelum dipasang ulang agar banner lama
  // tidak menutup banner baru lebih cepat.
  const feedbackTimerRef = useRef<number | undefined>(undefined)
  // Drawer keranjang di mobile/tablet
  const [mobileCartOpen, setMobileCartOpen] = useState(false)

  // Custom Item Modal state
  const [customModalProduct, setCustomModalProduct] = useState<Product | null>(null)
  const [customModalOpen, setCustomModalOpen] = useState(false)
  // Line keranjang yang sedang diedit lewat modal (mode edit, bukan add baru).
  const [editingLine, setEditingLine] = useState<CartItem | null>(null)

  // ---- ORDER DETAIL panel state ----
  // mode: 'new' = pesanan baru; 'open' = viewing open bill lama
  const [panelMode, setPanelMode] = useState<'new' | 'open'>('new')
  const [openOrder, setOpenOrder] = useState<OrderSummary | null>(null)
  const [orderType, setOrderType] = useState<OrderType>('DINE_IN')
  // Snapshot normalized items tiket saat dimuat — pembanding "dirty" sebelum bayar.
  const [ticketItemsJson, setTicketItemsJson] = useState<string | null>(null)
  // Snapshot meta (nama+gender) tiket saat dimuat — pasangan dirty utk ticketItemsJson.
  const [ticketMetaJson, setTicketMetaJson] = useState<string | null>(null)
  // Aksi tertunda yang menunggu konfirmasi "perubahan belum disimpan"
  // (pindah tiket, New Order, sign out). Nilai confirmLeave sendiri
  // diturunkan di bawah: state ini ATAU blocker navigasi react-router.
  const [pendingLeaveAction, setPendingLeaveAction] = useState<(() => void) | null>(null)

  // Panel kanan bisa diciutkan jadi rail vertikal (persist localStorage)
  const [panelCollapsed, setPanelCollapsed] = useState(() => {
    try {
      return localStorage.getItem(PANEL_COLLAPSED_KEY) === 'true'
    } catch {
      return false
    }
  })

  function togglePanelCollapsed() {
    setPanelCollapsed((prev) => {
      const next = !prev
      try {
        localStorage.setItem(PANEL_COLLAPSED_KEY, String(next))
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
      } catch {
        showFeedback('Failed to load data. Please check the connection and refresh.', true)
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
    clearTimeout(feedbackTimerRef.current)
    feedbackTimerRef.current = window.setTimeout(() => setFeedback(null), 4000)
  }

  // Buka modal custom untuk produk setiap kali kasir ingin menambah pesanan
  function handleOpenCustom(product: Product) {
    if (!product.isAvailable) return
    setCustomModalProduct(product)
    setCustomModalOpen(true)
  }

  // Edit line dari panel: buka modal customize yang sama, prefill nilai lama.
  function handleEditLine(line: CartItem) {
    setEditingLine(line)
    setCustomModalProduct(line.product)
    setCustomModalOpen(true)
  }

  // Handle konfirmasi custom options: edit line lama atau tambah line baru.
  function handleCustomConfirm(product: Product, options: { notes?: string; quantity: number }) {
    setCustomModalOpen(false)
    if (editingLine) {
      setNotes(editingLine.id, options.notes ?? '')
      setQuantity(editingLine.id, options.quantity)
      setEditingLine(null)
      return
    }
    addItem(product, options)
  }

  /** Kunci kanonik item utk pembanding dirty (produk+notes -> total qty). */
  function itemsKey(list: { id: number; quantity: number; notes?: string | null }[]): string {
    const map = new Map<string, number>()
    for (const i of list) {
      const key = `${i.id}|${i.notes?.trim() ?? ''}`
      map.set(key, (map.get(key) ?? 0) + i.quantity)
    }
    return JSON.stringify([...map.entries()].sort(([a], [b]) => a.localeCompare(b)))
  }

  const cartKey = () =>
    itemsKey(items.map((i) => ({ id: i.product.id, quantity: i.quantity, notes: i.notes })))

  const itemsPayload = (): OpenBillItemInput[] =>
    items.map((i) => ({
      productId: i.product.id,
      quantity: i.quantity,
      notes: i.notes?.trim() ? i.notes : undefined,
    }))
  const metaSnapshot = () => JSON.stringify({ name: customerName.trim(), gender: customerGender })

  // Dirty = ada perubahan tiket open bill yang belum disimpan (item / nama / gender).
  const openBillDirty =
    panelMode === 'open' &&
    openOrder !== null &&
    ticketItemsJson !== null &&
    (cartKey() !== ticketItemsJson || metaSnapshot() !== ticketMetaJson)

  // Perubahan belum tersimpan: tiket open bill yang diedit ATAU keranjang order
  const unsavedChanges = openBillDirty || (panelMode === 'new' && items.length > 0)

  // Pintu keluar dari mode edit tiket: bila dirty, minta konfirmasi dulu.
  function guardUnsaved(action: () => void) {
    if (unsavedChanges) {
      setPendingLeaveAction(() => action)
    } else {
      action()
    }
  }

  // Tutup/reload tab dengan perubahan belum disimpan -> dialog native browser.
  useEffect(() => {
    if (!unsavedChanges) return
    function onBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [unsavedChanges])

  // Blokir navigasi react-router saat ada perubahan yang belum disimpan.
  const blocker = useBlocker(unsavedChanges)
  const confirmLeave =
    pendingLeaveAction ??
    (blocker.state === 'blocked' ? () => blocker.proceed() : null)

  function applyUpdatedOrder(updated: UpdateOrderItemsResult) {
    setOpenOrder((prev) =>
      prev
        ? { ...prev, subtotal: updated.subtotal, grandTotal: updated.grandTotal, customerName: updated.customerName }
        : prev,
    )
    setTicketItemsJson(cartKey())
    setTicketMetaJson(metaSnapshot())
  }

  // Klik kartu ACTIVE ORDERS -> muat item tiket ke panel (bisa diedit, lalu
  // Save = update tiket yang sama, atau langsung Pay).
  function handleViewActiveOrder(orderId: number) {
    guardUnsaved(() => {
      void loadActiveOrder(orderId)
    })
  }

  async function loadActiveOrder(orderId: number) {
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
    setTicketMetaJson(JSON.stringify({ name: (summary.customerName ?? '').trim(), gender: summary.customerGender }))
    clear()
    setTicketItemsJson(null)
    try {
      const detail = await fetchOrderDetail(orderId)
      const missing: string[] = []
      for (const line of detail.items) {
        const product = line.productId != null ? products.find((p) => p.id === line.productId) : undefined
        if (!product) {
          missing.push(line.productName)
          continue
        }
        addItem(product, { quantity: line.quantity, notes: line.notes ?? undefined })
      }
      setTicketItemsJson(
        itemsKey(detail.items.map((l) => ({ id: l.productId ?? -1, quantity: l.quantity, notes: l.notes }))),
      )
      if (missing.length > 0) {
        showFeedback(`Some items are no longer in the menu and were skipped: ${missing.join(', ')}.`, true)
      }
    } catch {
      showFeedback('Failed to load order items. Please try again.', true)
    }
  }

  // Kembali ke pesanan baru (reset panel & keranjang)
  function handleNewOrder() {
    guardUnsaved(() => {
      setPanelMode('new')
      setOpenOrder(null)
      setOrderType('DINE_IN')
      setCustomerName('')
      setCustomerGender(null)
      clear()
      setTicketItemsJson(null)
      setTicketMetaJson(null)
    })
  }

  /** Simpan editan tiket open-bill ke server (full replace items + meta). */
  async function persistOpenTicket(order: OrderSummary): Promise<UpdateOrderItemsResult> {
    const updated = await updateOrderItemsRequest(order.id, {
      customerName: customerName.trim(),
      customerGender: customerGender ?? undefined,
      items: itemsPayload(),
    })
    applyUpdatedOrder(updated)
    return updated
  }

  // ---- Save: order baru -> open bill baru; tiket lama -> update items ----
  async function handleSaveOpenBill() {
    if (!customerName.trim()) {
      showFeedback('Customer name is required before saving.', true)
      return false
    }
    if (items.length === 0) {
      showFeedback('Order must contain at least 1 item.', true)
      return false
    }
    setSaving(true)
    setFeedback(null)
    try {
      if (panelMode === 'open' && openOrder) {
        const updated = await persistOpenTicket(openOrder)
        showFeedback(`Order ${updated.invoiceNumber} updated.`)
      } else {
        const saved = await openBillRequest({
          orderType,
          customerName: customerName.trim(),
          customerGender: customerGender ?? undefined,
          items: itemsPayload(),
        })
        clear() // keranjang reset otomatis setelah sukses
        showFeedback(`Order ${saved.invoiceNumber} saved to Active Orders.`)
        setMobileCartOpen(false)
      }
    } catch {
      showFeedback('Failed to save the order. Please try again.', true)
      return false
    } finally {
      setSaving(false)
    }
    // Refresh di luar try utama: gagal refresh bukan berarti gagal simpan.
    try {
      await loadData() // refresh: total di kartu tiket / Active Orders Line ikut berubah
    } catch {
      showFeedback('Saved, but failed to refresh the list.', true)
    }
    return true
  }

  // ---- Konfirmasi tinggalkan tiket dengan perubahan belum disimpan ----
  async function handleConfirmSave() {
    if (!confirmLeave) return
    const ok = await handleSaveOpenBill()
    if (ok) {
      setPendingLeaveAction(null)
      confirmLeave()
    }
  }

  function handleConfirmDiscard() {
    const action = confirmLeave
    if (!action) return
    setPendingLeaveAction(null)
    action()
  }

  // Pay: di mode open, simpan dulu bila item diedit agar total tersimpan =
  // total dibayar, lalu buka modal pembayaran.
  async function handlePayClick() {
    if (openBillDirty) {
      if (!customerName.trim()) {
        showFeedback('Customer name is required.', true)
        return
      }
      setSaving(true)
      setFeedback(null)
      try {
        await persistOpenTicket(openOrder)
        await loadData()
      } catch {
        showFeedback('Failed to update the order before payment. Please try again.', true)
        return
      } finally {
        setSaving(false)
      }
    }
    setPayOpen(true)
  }

  // ---- Bayar (create-then-pay untuk order baru / langsung bayar order open) ----
  async function handleCheckout(payload: CheckoutInput) {
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
        const created = await openBillRequest({
          orderType,
          customerName: customerName.trim(),
          customerGender: customerGender ?? undefined,
          items: itemsPayload(),
        })
        orderId = created.orderId
        // Adopt tiket baru SEGERA: bila checkout gagal, retry memakai orderId
        // yang sama (tidak membuat tiket duplikat di server).
        setPanelMode('open')
        setOpenOrder({
          id: created.orderId,
          invoiceNumber: created.invoiceNumber,
          orderType: created.orderType,
          status: created.status,
          customerName: created.customerName,
          customerGender,
          subtotal: created.subtotal,
          grandTotal: created.grandTotal,
          tableNumber: created.tableNumber,
          itemCount: cartItemCount,
          createdAt: new Date().toISOString(),
        })
        setTicketItemsJson(cartKey())
        setTicketMetaJson(metaSnapshot())
      }

      const done = await checkoutRequest(orderId, payload)
      setPayOpen(false)
      setOpenOrder(null)
      setPanelMode('new')
      setOrderType('DINE_IN')
      setCustomerName('')
      setCustomerGender(null)
      clear()
      setTicketItemsJson(null)
      setTicketMetaJson(null)
      setReceipt(done) // tampilkan pratinjau struk setelah transaksi sukses
    } catch {
      showFeedback('Failed to process the payment. Please try again.', true)
    } finally {
      setSubmittingPayment(false)
    }
    // Refresh di luar try utama: kegagalan refresh TIDAK boleh dibilang
    // "payment failed" ke kasir — pembayaran sudah sukses di server.
    try {
      await loadData() // refresh: kartu OPEN_BILL hilang, paid history bertambah
    } catch {
      showFeedback('Payment recorded, but failed to refresh the data.', true)
    }
  }

  // ---- Lock Register (kunci sesi kasir; implementasi penuh di task shift) ----
  function lockRegister() {
    showFeedback('Lock Register is not available in this phase.')
  }

  const isNewPanel = panelMode === 'new'
  // Panel order (desktop 380px + drawer mobile): props kedua call site
  // identik, jadi satu elemen React dihoist dan dirender di 2 tempat.
  const orderPanel = (
    <OrderDetailsPanel
      mode={panelMode}
      orderNumber={isNewPanel ? null : openOrder?.id ?? null}
      items={items}
      customerName={customerName}
      setCustomerName={setCustomerName}
      customerGender={customerGender}
      setCustomerGender={setCustomerGender}
      orderType={orderType}
      setOrderType={setOrderType}
      onIncrease={increase}
      onDecrease={decrease}
      onEditItem={handleEditLine}
      onRemoveItem={removeItem}
      onClearCart={clear}
      onNewOrder={handleNewOrder}
      onPay={handlePayClick}
      onSaveOpenBill={handleSaveOpenBill}
      saving={saving}
    />
  )

  return (
    <div className="flex h-svh flex-col bg-[#F8FAFC] text-slate-900 selection:bg-[#65AF92]/30 selection:text-[#2d5258] lg:flex-row">
      {/* ===== Zone 1: Sidebar (desktop ≥lg) / Top bar + drawer (mobile <lg) ===== */}
      <MobileNav
        page="Register"
        onOpenHistory={() => setHistoryOpen(true)}
        onLockRegister={lockRegister}
        onFeatureNotice={(msg) => showFeedback(msg)}
        onSignOut={() => guardUnsaved(logout)}
      />
      <NavigationRail
        className="hidden lg:flex"
        onOpenHistory={() => setHistoryOpen(true)}
        onLockRegister={lockRegister}
        onFeatureNotice={(msg) => showFeedback(msg)}
        onSignOut={() => guardUnsaved(logout)}
      />

      {/* ===== Zone 2: Scrollable main content ===== */}
      <main className="flex min-w-0 flex-1 flex-col space-y-4 overflow-y-auto bg-[#F8FAFC] p-4 pb-24 lg:pb-4">
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
        <section className="flex flex-col space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:min-h-0 lg:flex-1">
          {/* Header band */}
          <div className="flex flex-shrink-0 items-center justify-between pb-1">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Icon name="restaurant_menu" className="text-[20px] text-[#447C84]" />
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
              <Icon name={catalogOpen ? 'expand_less' : 'expand_more'} className="text-[18px]" />
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
          <div className="space-y-6 pr-1 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
            {loading ? (
              <div className="flex h-64 flex-col items-center justify-center gap-2 text-slate-400">
                <Icon name="coffee" className="animate-bounce text-3xl text-[#447C84]/60" />
                <p className="text-sm font-medium">Loading menu...</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <EmptyState
                icon="search"
                title="No menu found"
                description="Try a different keyword or category."
                className="h-64"
              />
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
          'relative z-20 hidden h-full flex-col border-l border-slate-200/80 bg-white transition-all duration-300 lg:flex',
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
                {panelMode === 'open' && openOrder ? formatOrderLabel(openOrder.id) : 'NEW'}
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
            {orderPanel}
          </div>
        )}
      </aside>

      {/* ===== Floating Mobile/Tablet Cart Bar (Bottom) ===== */}
      <div className="fixed bottom-0 left-0 right-0 z-30 flex items-center justify-between border-t border-slate-200/80 bg-white/95 px-4 py-3 shadow-modal backdrop-blur-md lg:hidden">
        <div>
          <span className="text-xs font-bold text-slate-500">
            {customerName.trim() || 'Walk-in'}
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
            {/* Grabber + close — judul dari OrderDetailsPanel saja, tidak diduplikasi di sini */}
            <div className="relative mb-2 flex h-6 shrink-0 items-center justify-center">
              <span className="h-1.5 w-10 rounded-full bg-slate-200" />
              <button
                type="button"
                onClick={() => setMobileCartOpen(false)}
                aria-label="Close order details"
                className="absolute right-0 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-900"
              >
                <Icon name="close" className="text-lg" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {orderPanel}
            </div>
          </div>
        </div>
      )}

      {/* ===== Modals ===== */}
      {customModalProduct && customModalOpen && (
        <CustomItemModal
          product={customModalProduct}
          editing={
            editingLine
              ? { notes: editingLine.notes ?? '', quantity: editingLine.quantity }
              : undefined
          }
          onClose={() => {
            setCustomModalOpen(false)
            setEditingLine(null)
          }}
          onConfirm={(notes, quantity) =>
            handleCustomConfirm(customModalProduct, { notes, quantity })
          }
        />
      )}
      {confirmLeave && (
        <UnsavedChangesModal
          saving={saving}
          onSave={handleConfirmSave}
          onDiscard={handleConfirmDiscard}
          onClose={() => {
            // Modal tertutup tanpa keputusan: bila pemicunya navigasi yang
            // diblokir, batalkan blokir agar router tidak menggantung.
            setPendingLeaveAction(null)
          }}
        />
      )}
      {payOpen && (
        <PaymentModal
          grandTotal={panelMode === 'open' && openOrder ? openOrder.grandTotal : cartSubtotal}
          itemCount={cartItemCount}
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
