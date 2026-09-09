import { useEffect, useMemo, useState } from 'react'
import {
  Banknote,
  Calendar,
  Clock,
  Flame,
  Minus,
  Plus,
  Receipt,
  ShoppingBag,
  SlidersHorizontal,
  Star,
  StickyNote,
  Trash2,
  X,
} from 'lucide-react'
import type { CustomerGender, OrderType, Product } from '@/api/client'
import { cn } from '@/lib/utils'
import { formatRupiah } from '@/utils/format'
import { getProductImage } from '@/utils/productImages'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export interface OrderLine {
  id: string
  product: Product
  quantity: number
  notes?: string
}

interface OrderDetailsPanelProps {
  mode: 'new' | 'open'
  /** Nomor tiket order (id) — untuk mode open. */
  orderNumber: number | null
  /** Tanggal/jam tiket (untuk mode open). */
  createdAt: string | null
  items: OrderLine[]
  customerName: string
  setCustomerName: (v: string) => void
  customerGender: CustomerGender | null
  setCustomerGender: (v: CustomerGender | null) => void
  orderType: OrderType
  setOrderType: (t: OrderType) => void
  onIncrease: (id: string) => void
  onDecrease: (id: string) => void
  onSetNotes: (id: string, notes: string) => void
  onRemoveItem: (id: string) => void
  onClearCart: () => void
  onNewOrder: () => void
  onPay: () => void
  onSaveOpenBill: () => void
  saving: boolean
  /** Error validasi simpan (nama kosong). */
  validationError: string | null
}

const GENDERS: { v: CustomerGender; label: string; emoji: string }[] = [
  { v: 'L', label: 'Male (L)', emoji: '👨' },
  { v: 'P', label: 'Female (P)', emoji: '👩' },
]

function formatDateTime(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function padOrder(id: number): string {
  return `#${String(id).padStart(3, '0')}`
}

/**
 * Zone 3 — Right Order Details Panel (~380px).
 * Header nomor tiket harian + tanggal/jam; saat viewing open bill lama muncul
 * indikator "Viewing Order #0XX (Open Bill)" + tombol [✕ New Order]. Memuat
 * segmented toggle Dine In / Takeaway, input nama pelanggan wajib, daftar item
 * keranjang (foto, nama, stepper qty, catatan, hapus), quick gender selector,
 * ringkasan subtotal + grand total, serta tombol Pay Now (solid) & Save Open
 * Bill (outline).
 */
export default function OrderDetailsPanel({
  mode,
  orderNumber,
  createdAt,
  items,
  customerName,
  setCustomerName,
  customerGender,
  setCustomerGender,
  orderType,
  setOrderType,
  onIncrease,
  onDecrease,
  onSetNotes,
  onRemoveItem,
  onClearCart,
  onNewOrder,
  onPay,
  onSaveOpenBill,
  saving,
  validationError,
}: OrderDetailsPanelProps) {
  const isOpen = mode === 'open'

  // Live date & time shown in the ticket header (moved from the removed POS top bar)
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const todayLabel = useMemo(
    () =>
      new Intl.DateTimeFormat('en-US', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(now),
    [now],
  )
  const timeLabel = useMemo(
    () => new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }).format(now),
    [now],
  )

  const subtotal = useMemo(
    () => items.reduce((sum, i) => sum + i.product.price * i.quantity, 0),
    [items],
  )
  const itemCount = useMemo(() => items.reduce((sum, i) => sum + i.quantity, 0), [items])

  const nameMissing = customerName.trim().length === 0

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Header: ticket number + date/time (live for new tickets) */}
      <div className="mb-4 flex items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-bold tracking-tight text-foreground">
            {isOpen && orderNumber != null ? `Order ${padOrder(orderNumber)}` : 'New Order'}
          </h2>
          {isOpen ? (
            <p className="text-[11px] text-muted-foreground">{formatDateTime(createdAt)}</p>
          ) : (
            <p className="text-[11px] text-muted-foreground">Not saved yet — new ticket</p>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {(isOpen) && (
            <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-700">
              Open Bill
            </span>
          )}
        </div>
      </div>

      {/* Date/time bar (lives inside the ticket panel) */}
      <div className="mb-4 flex items-center justify-between rounded-xl border border-border/70 bg-secondary/40 px-3 py-2">
        <div className="flex items-center gap-2 text-[11px] font-semibold text-muted-foreground">
          <Calendar className="h-3.5 w-3.5 text-primary" />
          <span>{todayLabel}</span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] font-bold text-primary tabular-nums">
          <Clock className="h-3.5 w-3.5" />
          <span>{timeLabel}</span>
        </div>
      </div>

      {/* Indikator Viewing Open Bill + tombol New Order */}
      {isOpen && (
        <div className="mb-4 flex items-center justify-between rounded-xl border border-amber-300/60 bg-amber-50/60 px-3 py-2">
          <p className="text-[11px] font-semibold text-amber-800">
            Viewing Order {orderNumber != null ? padOrder(orderNumber) : ''} (Open Bill)
          </p>
          <Button size="sm" variant="ghost" onClick={onNewOrder} className="h-10 px-3 text-[11px] text-amber-800 hover:bg-amber-100">
            <X className="h-3.5 w-3.5" />
            New Order
          </Button>
        </div>
      )}

      {/* Segmented toggle Dine In / Takeaway */}
      <div className="mb-4">
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Tipe Pesanan
        </label>
        <div className="grid grid-cols-2 gap-1 rounded-xl border border-border/80 bg-secondary/40 p-1">
          {(['DINE_IN', 'TAKE_AWAY'] as OrderType[]).map((t) => {
            const active = orderType === t
            return (
              <button
                key={t}
                type="button"
                onClick={() => setOrderType(t)}
                className={cn(
                  'flex h-11 items-center justify-center rounded-lg text-sm font-bold transition-all duration-150 active:scale-[0.98]',
                  active
                    ? 'bg-card text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {t === 'DINE_IN' ? 'Dine In' : 'Takeaway'}
              </button>
            )
          })}
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
        {/* Customer name (wajib) */}
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Customer Name <span className="text-destructive">*</span>
          </label>
          <Input
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="Nama pelanggan (wajib)"
            className={cn('h-10 bg-card text-sm', nameMissing && 'border-destructive/70 focus-visible:border-destructive')}
            aria-invalid={nameMissing}
          />
          {nameMissing && (
            <p className="mt-1 text-[11px] font-medium text-destructive">
              Nama pelanggan wajib diisi sebelum menyimpan.
            </p>
          )}
        </div>

        {/* Quick gender selector */}
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Demografi (Gender)
          </label>
          <div className="grid grid-cols-2 gap-2.5">
            {GENDERS.map((opt) => {
              const active = customerGender === opt.v
              return (
                <button
                  key={opt.v}
                  type="button"
                  onClick={() => setCustomerGender(opt.v)}
                  className={cn(
                    'flex h-11 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-semibold transition-all duration-150 active:scale-95',
                    active
                      ? 'border-primary bg-primary text-primary-foreground shadow-xs'
                      : 'border-border/80 bg-background text-foreground hover:bg-accent',
                  )}
                >
                  <span>{opt.emoji}</span>
                  <span>{opt.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Daftar item keranjang */}
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Items ({itemCount})
            </label>
            {items.length > 0 && (
              <button
                onClick={onClearCart}
                className="flex h-10 items-center rounded-lg px-2 text-[11px] font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
              >
                Kosongkan
              </button>
            )}
          </div>

          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/70 p-6 text-center text-muted-foreground">
              <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-muted/60 text-muted-foreground/60">
                <ShoppingBag className="h-5 w-5" />
              </div>
              <p className="text-sm font-semibold text-foreground">Belum ada item</p>
              <p className="mt-0.5 max-w-[200px] text-xs text-muted-foreground">
                Pilih menu di katalog untuk menambahkan pesanan.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {items.map((item) => (
                <CartLineItem
                  key={item.id}
                  item={item}
                  onIncrease={onIncrease}
                  onDecrease={onDecrease}
                  onSetNotes={onSetNotes}
                  onRemoveItem={onRemoveItem}
                />
              ))}
            </div>
          )}
        </div>

        {/* Ringkasan finansial */}
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Ringkasan
          </label>
          <div className="rounded-2xl border border-border/70 bg-background/60 p-3.5 shadow-subtle">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-muted-foreground">Subtotal</span>
              <span className="font-semibold text-foreground tabular-nums">
                {formatRupiah(subtotal)}
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between border-t border-border/70 pt-2.5">
              <span className="text-sm font-bold text-foreground">Grand Total</span>
              <span className="text-lg font-bold text-primary tabular-nums">
                {formatRupiah(subtotal)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Aksi */}
      <div className="space-y-2.5 pt-3">
        {validationError && (
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-[11px] font-semibold text-destructive">
            {validationError}
          </p>
        )}
        <Button className="h-11 w-full text-sm font-bold shadow-sm" onClick={onPay}>
          <Banknote className="h-4 w-4" />
          Pay Now • {formatRupiah(subtotal)} →
        </Button>
        <Button
          variant="outline"
          className="h-11 w-full text-sm font-bold shadow-sm"
          disabled={saving}
          onClick={onSaveOpenBill}
        >
          <Receipt className="h-4 w-4" />
          {saving ? 'Menyimpan...' : 'Save Open Bill'}
        </Button>
      </div>
    </div>
  )
}

/** Baris item keranjang: foto kecil, nama, stepper qty, catatan, hapus. */
function CartLineItem({
  item,
  onIncrease,
  onDecrease,
  onSetNotes,
  onRemoveItem,
}: {
  item: OrderLine
  onIncrease: (id: string) => void
  onDecrease: (id: string) => void
  onSetNotes: (id: string, notes: string) => void
  onRemoveItem: (id: string) => void
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-background/60 p-3 shadow-subtle">
      <div className="flex items-start gap-2.5">
        <img
          src={getProductImage(item.product.name, item.product.categoryName)}
          alt={item.product.name}
          loading="lazy"
          className="h-12 w-12 shrink-0 rounded-xl object-cover shadow-xs"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-sm font-semibold text-foreground leading-tight">
              {item.product.name}
            </p>
            {item.product.isBestSeller && <Flame className="h-3 w-3 shrink-0 text-amber-500" />}
            {item.product.isRecommended && <Star className="h-3 w-3 shrink-0 text-amber-500" />}
          </div>
          <p className="mt-0.5 text-xs font-medium text-muted-foreground tabular-nums">
            {formatRupiah(item.product.price)} x {item.quantity}
          </p>
          {item.notes && (
            <div className="mt-1 flex flex-wrap gap-1">
              <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                <SlidersHorizontal className="h-3 w-3" />
                {item.notes}
              </span>
            </div>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <div className="flex items-center gap-1 rounded-xl border border-border/80 bg-card p-1">
            <button
              onClick={() => onDecrease(item.id)}
              className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-muted text-foreground transition-colors active:scale-90"
              aria-label="Kurangi kuantiti"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="w-7 text-center text-sm font-bold tabular-nums text-foreground">
              {item.quantity}
            </span>
            <button
              onClick={() => onIncrease(item.id)}
              className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-muted text-foreground transition-colors active:scale-90"
              aria-label="Tambah kuantiti"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <button
            onClick={() => onRemoveItem(item.id)}
            className="flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground/60 hover:bg-destructive/10 hover:text-destructive transition-colors active:scale-90"
            title="Hapus baris ini"
            aria-label="Hapus item"
          >
            <Trash2 className="h-4 w-4" />
          </button>
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
        <p className="text-xs font-bold text-foreground tabular-nums shrink-0">
          {formatRupiah(item.product.price * item.quantity)}
        </p>
      </div>
    </div>
  )
}
