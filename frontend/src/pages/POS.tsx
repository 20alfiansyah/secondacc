import { useEffect, useMemo, useState } from 'react'
import {
  Banknote,
  Coffee,
  LogOut,
  Minus,
  Plus,
  Receipt,
  Search,
  ShoppingBag,
  StickyNote,
} from 'lucide-react'
import type { CafeTable, Product } from '@/api/client'
import { checkoutRequest, fetchProducts, fetchTables, openBillRequest } from '@/api/client'
import type { OpenBillItemInput } from '@/api/client'
import { useAuthStore } from '@/store/authStore'
import { useCartStore } from '@/store/cartStore'
import { formatRupiah } from '@/utils/format'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import PaymentModal from '@/components/PaymentModal'
import ReceiptModal from '@/components/ReceiptModal'
import type { CheckoutResult } from '@/api/client'

interface CategoryTab {
  id: number | 'all'
  name: string
}

export default function POS() {
  const { user, logout } = useAuthStore()
  const { items, increase, decrease, addItem, setNotes, clear } = useCartStore()

  const [products, setProducts] = useState<Product[]>([])
  const [tables, setTables] = useState<CafeTable[]>([])
  const [activeCategory, setActiveCategory] = useState<number | 'all'>('all')
  const [search, setSearch] = useState('')
  const [selectedTable, setSelectedTable] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [opening, setOpening] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)

  // Order OPEN_BILL yang sedang dipilih (detail dari klik meja terisi).
  const [selectedOrder, setSelectedOrder] = useState<
    { id: number; tableId: number; tableNumber: string; grandTotal: number; itemCount: number } | null
  >(null)
  const [payOpen, setPayOpen] = useState(false)
  const [submittingPayment, setSubmittingPayment] = useState(false)
  const [receipt, setReceipt] = useState<CheckoutResult | null>(null)

  async function loadData() {
    const [productData, tableData] = await Promise.all([fetchProducts(), fetchTables()])
    setProducts(productData)
    setTables(tableData)
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

  // Tab kategori diturunkan dari data produk (backend tidak punya endpoint categories).
  const categoryTabs: CategoryTab[] = useMemo(() => {
    const seen = new Map<number, string>()
    for (const p of products) seen.set(p.categoryId, p.categoryName)
    const tabs: CategoryTab[] = Array.from(seen.entries()).map(([id, name]) => ({
      id,
      name,
    }))
    return [{ id: 'all', name: 'Semua' }, ...tabs]
  }, [products])

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase()
    return products.filter((p) => {
      if (activeCategory !== 'all' && p.categoryId !== activeCategory) return false
      if (q && !p.name.toLowerCase().includes(q)) return false
      return true
    })
  }, [products, activeCategory, search])

  const cartSubtotal = items.reduce((sum, i) => sum + i.product.price * i.quantity, 0)
  const cartItemCount = items.reduce((sum, i) => sum + i.quantity, 0)

  // ---- Open Bill ----
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
      await openBillRequest({ tableId: selectedTable, items: payload })
      clear() // keranjang reset otomatis setelah sukses
      await loadData() // refresh: meja jadi terisi
      setFeedback('Pesanan berhasil disimpan ke meja.')
    } catch {
      setFeedback('Gagal menyimpan pesanan. Coba lagi.')
    } finally {
      setOpening(false)
    }
  }

  // ---- Checkout ----
  async function handleCheckout(payload: {
    customerGender: 'P' | 'L'
    payment: { category: 'CASH' | 'THIRD_PARTY' | 'EDC'; methodName: string; amountPaid: number }
  }) {
    if (!selectedOrder) return
    setSubmittingPayment(true)
    try {
      const done = await checkoutRequest(selectedOrder.id, payload)
      setPayOpen(false)
      setSelectedOrder(null)
      await loadData() // refresh: meja jadi kosong
      setReceipt(done) // tampilkan pratinjau struk setelah transaksi sukses
    } catch {
      setFeedback('Gagal memproses pembayaran. Coba lagi.')
    } finally {
      setSubmittingPayment(false)
    }
  }

  return (
    <div className="flex h-svh flex-col bg-muted/30">
      {/* Header */}
      <header className="flex items-center justify-between border-b bg-background px-6 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <Coffee className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-sm font-semibold leading-tight">Layar Kasir</h1>
            <p className="text-xs text-muted-foreground">{user?.name}</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={logout}>
          <LogOut className="h-4 w-4" />
          Keluar
        </Button>
      </header>

      <div className="grid flex-1 grid-cols-1 gap-4 overflow-hidden p-4 lg:grid-cols-[1fr_360px]">
        {/* ===== Kolom Kiri: katalog menu ===== */}
        <div className="flex min-h-0 flex-col">
          <div className="mb-4 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Cari menu…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {categoryTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveCategory(tab.id)}
                  className={cn(
                    'shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors',
                    activeCategory === tab.id
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-background text-muted-foreground hover:bg-accent',
                  )}
                >
                  {tab.name}
                </button>
              ))}
            </div>
          </div>

          {feedback && (
            <p className="mb-3 rounded-md bg-primary/10 px-3 py-2 text-sm text-primary">
              {feedback}
            </p>
          )}

          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            {loading ? (
              <p className="py-10 text-center text-sm text-muted-foreground">Memuat menu…</p>
            ) : filteredProducts.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                Tidak ada menu yang cocok.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                {filteredProducts.map((product) => (
                  <button
                    key={product.id}
                    disabled={!product.isAvailable}
                    onClick={() => addItem(product)}
                    className={cn(
                      'group rounded-xl border bg-background p-4 text-left shadow-sm transition-all',
                      product.isAvailable
                        ? 'hover:border-primary/50 hover:shadow-md'
                        : 'cursor-not-allowed opacity-60',
                    )}
                  >
                    <div className="mb-2 flex items-start justify-between">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <Coffee className="h-5 w-5 text-primary" />
                      </div>
                      {!product.isAvailable && (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                          Sold Out
                        </span>
                      )}
                    </div>
                    <p className="line-clamp-2 text-sm font-medium leading-snug">{product.name}</p>
                    <p className="mt-1 text-sm font-semibold text-primary">
                      {formatRupiah(product.price)}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ===== Kolom Kanan: meja + keranjang ===== */}
        <Card className="flex min-h-0 flex-col overflow-hidden">
          <CardContent className="flex h-full min-h-0 flex-col p-4">
            {/* Pemilih meja */}
            <div className="mb-4">
              <h2 className="mb-2 text-sm font-semibold text-muted-foreground">Nomor Meja</h2>
              <div className="flex flex-wrap gap-2">
                {tables.map((table) => {
                  const occupied = table.isOccupied
                  const active = selectedTable === table.id
                  return (
                    <button
                      key={table.id}
                      onClick={() => {
                        setSelectedTable(table.id)
                        // Klik meja terisi -> buka kembali pesanan (untuk checkout)
                        if (occupied && table.activeOrder) {
                          setSelectedOrder({
                            id: table.activeOrder.id,
                            tableId: table.id,
                            tableNumber: table.tableNumber,
                            grandTotal: table.activeOrder.subtotal,
                            itemCount: table.activeOrder.itemCount,
                          })
                        }
                      }}
                      title={
                        occupied
                          ? `${table.tableNumber} (terisi)`
                          : table.tableNumber
                      }
                      className={cn(
                        'relative flex h-10 w-16 items-center justify-center rounded-lg border text-sm font-medium transition-colors',
                        active
                          ? 'border-primary bg-primary text-primary-foreground'
                          : occupied
                            ? 'cursor-pointer border-amber-300 bg-amber-50 text-amber-700 hover:border-primary/50'
                            : 'border-border bg-background hover:border-primary/50',
                      )}
                    >
                      {table.tableNumber.replace(/\D/g, '')}
                      {occupied && (
                        <span className="absolute -right-1 -top-1 flex h-3 w-3">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                          <span className="relative inline-flex h-3 w-3 rounded-full bg-amber-500" />
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
              {/* Indikator open bill terpilih */}
              {selectedOrder && (
                <div className="mt-3 flex items-center justify-between rounded-lg border border-amber-300 bg-amber-50 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <Receipt className="h-4 w-4 text-amber-600" />
                    <div>
                      <p className="text-xs font-medium text-amber-800">
                        Open Bill • {selectedOrder.tableNumber}
                      </p>
                      <p className="text-xs text-amber-700">
                        {selectedOrder.itemCount} item • {formatRupiah(selectedOrder.grandTotal)}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => setPayOpen(true)}
                    className="bg-amber-600 hover:bg-amber-700"
                  >
                    <Banknote className="h-4 w-4" />
                    Bayar
                  </Button>
                </div>
              )}
            </div>

            {/* Keranjang */}
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-sm font-semibold">
                  <ShoppingBag className="h-4 w-4" />
                  Keranjang
                  {cartItemCount > 0 && (
                    <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                      {cartItemCount}
                    </span>
                  )}
                </h2>
                {items.length > 0 && (
                  <button onClick={clear} className="text-xs text-muted-foreground hover:underline">
                    Kosongkan
                  </button>
                )}
              </div>

              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
                {items.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    Keranjang masih kosong.
                  </p>
                ) : (
                  items.map((item) => (
                    <div key={item.product.id} className="rounded-lg border bg-background p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{item.product.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatRupiah(item.product.price)}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => decrease(item.product.id)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-6 text-center text-sm font-medium">
                            {item.quantity}
                          </span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => increase(item.product.id)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <StickyNote className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <input
                          value={item.notes ?? ''}
                          onChange={(e) => setNotes(item.product.id, e.target.value)}
                          placeholder="Catatan (opsional)"
                          className="w-full rounded border-0 bg-transparent px-0 py-0.5 text-xs text-muted-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-0"
                        />
                      </div>
                      <p className="mt-1.5 text-right text-sm font-semibold">
                        {formatRupiah(item.product.price * item.quantity)}
                      </p>
                    </div>
                  ))
                )}
              </div>

              {/* Subtotal + Open Bill */}
              <div className="mt-4 space-y-2 border-t pt-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-semibold">{formatRupiah(cartSubtotal)}</span>
                </div>
                <Button
                  className="w-full"
                  size="lg"
                  disabled={items.length === 0 || !selectedTable || opening}
                  onClick={handleOpenBill}
                >
                  {opening ? 'Menyimpan…' : 'Open Bill'}
                </Button>
                {!selectedTable && items.length > 0 && (
                  <p className="text-center text-xs text-muted-foreground">
                    Pilih nomor meja terlebih dahulu.
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {payOpen && selectedOrder && (
        <PaymentModal
          grandTotal={selectedOrder.grandTotal}
          itemCount={selectedOrder.itemCount}
          tableNumber={selectedOrder.tableNumber.replace(/\D/g, '')}
          submitting={submittingPayment}
          onSubmit={handleCheckout}
          onClose={() => setPayOpen(false)}
        />
      )}

      {receipt && (
        <ReceiptModal order={receipt} onClose={() => setReceipt(null)} />
      )}
    </div>
  )
}
