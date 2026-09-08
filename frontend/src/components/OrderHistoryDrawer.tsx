import { useEffect, useMemo, useState } from 'react'
import { History, Printer, Receipt, Search, X } from 'lucide-react'
import type { OrderDetail, OrderSummary } from '@/api/client'
import { fetchOrderDetail, fetchOrderHistory } from '@/api/client'
import { formatRupiah } from '@/utils/format'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import ReceiptModal from '@/components/ReceiptModal'

type DateFilter = 'ALL' | 'TODAY' | 'YESTERDAY'

interface OrderHistoryDrawerProps {
  open: boolean
  onClose: () => void
}

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Format jam pendek (mis. 21:04) untuk baris tabel. */
function formatTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
}

/**
 * Slide-over drawer Order History (Task 1.3.10).
 * Dibuka dari ikon Order History di NavigationRail — hanya menampilkan riwayat,
 * TANPA me-reload halaman kasir / menghapus keranjang yang sedang diketik.
 * Berisi search (invoice/nama pelanggan), filter tanggal (Today/Yesterday/All),
 * daftar transaksi PAID + tombol Reprint Receipt (preview struk + window.print()).
 */
export default function OrderHistoryDrawer({ open, onClose }: OrderHistoryDrawerProps) {
  const [orders, setOrders] = useState<OrderSummary[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [dateFilter, setDateFilter] = useState<DateFilter>('ALL')
  const [receipt, setReceipt] = useState<OrderDetail | null>(null)
  const [loadingReceipt, setLoadingReceipt] = useState<number | null>(null)

  // Muat ulang tiap kali drawer dibuka agar mencerminkan transaksi terbaru
  useEffect(() => {
    if (!open) return
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const data = await fetchOrderHistory()
        if (!cancelled) setOrders(data)
      } catch {
        // Biarkan daftar kosong; POS menampilkan feedback sendiri bila perlu
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [open])

  // Esc untuk menutup drawer
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const today = new Date()
    const todayKey = dayKey(today)
    const yesterday = new Date(today)
    yesterday.setDate(today.getDate() - 1)
    const yesterdayKey = dayKey(yesterday)

    return orders.filter((o) => {
      if (dateFilter === 'TODAY' && dayKey(new Date(o.createdAt)) !== todayKey) return false
      if (dateFilter === 'YESTERDAY' && dayKey(new Date(o.createdAt)) !== yesterdayKey) return false
      if (q) {
        const inv = (o.invoiceNumber ?? '').toLowerCase()
        const name = (o.customerName ?? '').toLowerCase()
        if (!inv.includes(q) && !name.includes(q)) return false
      }
      return true
    })
  }, [orders, search, dateFilter])

  async function handleReprint(orderId: number) {
    setLoadingReceipt(orderId)
    try {
      const detail = await fetchOrderDetail(orderId)
      setReceipt(detail)
    } catch {
      // Tetap tutup spinner; cetak ulang gagal tanpa feedback detail di sini
    } finally {
      setLoadingReceipt(null)
    }
  }

  if (!open) return null

  return (
    <>
      {/* Backdrop + slide-over drawer dari kanan */}
      <div className="fixed inset-0 z-50">
        <div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={onClose}
        />
        <div className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col border-l border-border/80 bg-card shadow-modal animate-in slide-in-from-right duration-200">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border/70 px-5 py-4">
            <div className="flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              <div>
                <h2 className="text-base font-bold text-foreground">Order History</h2>
                <p className="text-[11px] text-muted-foreground">
                  Transaksi selesai — reprint struk thermal
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              aria-label="Tutup"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Search + date filter */}
          <div className="space-y-2.5 border-b border-border/70 p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari invoice / nama pelanggan..."
                className="h-10 bg-background pl-9 text-sm"
              />
            </div>
            <div className="grid grid-cols-3 gap-1 rounded-xl border border-border/80 bg-secondary/40 p-1">
              {(
                [
                  ['ALL', 'Semua'],
                  ['TODAY', 'Today'],
                  ['YESTERDAY', 'Yesterday'],
                ] as [DateFilter, string][]
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setDateFilter(key)}
                  className={cn(
                    'flex h-11 items-center justify-center rounded-lg text-sm font-bold transition-all duration-150',
                    dateFilter === key
                      ? 'bg-card text-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Daftar transaksi */}
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            {loading ? (
              <div className="flex h-32 items-center justify-center text-muted-foreground">
                <div className="flex flex-col items-center gap-2">
                  <Receipt className="h-6 w-6 animate-pulse text-primary/60" />
                  <p className="text-sm font-medium">Memuat riwayat...</p>
                </div>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex h-32 flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 p-6 text-center text-muted-foreground">
                <History className="mb-2 h-7 w-7 opacity-40" />
                <p className="text-sm font-medium text-foreground">Belum ada transaksi</p>
                <p className="text-xs">Transaksi yang sudah dibayar akan tampil di sini.</p>
              </div>
            ) : (
              <ul className="space-y-2.5">
                {filtered.map((order) => (
                  <li
                    key={order.id}
                    className="rounded-2xl border border-border/70 bg-background/60 p-3.5 shadow-subtle"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        {/* Invoice + nama pelanggan */}
                        <p className="truncate text-sm font-bold text-foreground">
                          {order.invoiceNumber}
                        </p>
                        <p className="truncate text-[11px] text-muted-foreground">
                          {order.customerName?.trim() || 'Pelanggan'} •{' '}
                          {order.orderType === 'TAKE_AWAY' ? 'Takeaway' : 'Dine In'}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
                        PAID
                      </span>
                    </div>

                    {/* Detail metode bayar, jam, total */}
                    <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-border/60 pt-2">
                      <div className="min-w-0 text-left">
                        <p className="text-[11px] font-semibold text-muted-foreground">
                          {order.paymentName ?? '—'} • {formatTime(order.createdAt)}
                        </p>
                        <p className="text-xs font-medium text-foreground">
                          {order.itemCount} item
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="text-base font-black text-primary tabular-nums">
                          {formatRupiah(order.grandTotal)}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleReprint(order.id)}
                          disabled={loadingReceipt === order.id}
                          className="h-11 gap-1.5 px-3 text-xs"
                        >
                          <Printer className="h-3.5 w-3.5" />
                          {loadingReceipt === order.id ? 'Menyiapkan...' : 'Reprint'}
                        </Button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Preview struk untuk reprint — reuse ReceiptModal dgn isolasi print CSS */}
      {receipt && <ReceiptModal order={receipt} onClose={() => setReceipt(null)} />}
    </>
  )
}
