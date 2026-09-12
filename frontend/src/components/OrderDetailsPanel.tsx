import { useEffect, useMemo, useState } from 'react'
import type { CustomerGender, OrderType, Product } from '@/api/client'
import { cn } from '@/lib/utils'
import { formatRupiah } from '@/utils/format'
import { Input } from '@/components/ui/input'
import Icon from '@/components/ui/Icon'

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

const GENDERS: { v: CustomerGender; label: string; glyph: string }[] = [
  { v: 'L', label: 'Male (L)', glyph: 'male' },
  { v: 'P', label: 'Female (P)', glyph: 'female' },
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
 * Zone 3 — Right Order Details Panel (~380px, Stitch design).
 * Header "Order Details" + metadata box tiket (nomor, tipe, Open Bill pill,
 * customer + gender), segmented Dine In/Takeaway berikon, form nama & gender,
 * daftar item (chip catatan, stepper qty — tombol − berubah trash saat qty=1),
 * ringkasan Subtotal + Grand Total, CTA gradien Pay Now + Save Open Bill.
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

  // Live date & time shown in the ticket metadata bar
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
      {/* Header: ORDER DETAILS + tombol New Order (mode open) */}
      <div className="shrink-0 space-y-3 border-b border-slate-100 p-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2">
            <Icon name="receipt_long" className="text-lg text-primary" />
            <h2 className="font-display text-xs font-bold uppercase tracking-wider text-slate-800">
              Order Details
            </h2>
          </div>
          {isOpen && (
            <button
              type="button"
              onClick={onNewOrder}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-all hover:bg-primary-hover active:scale-95"
            >
              <Icon name="add" className="text-sm" />
              New Order
            </button>
          )}
        </div>

        {/* Ticket metadata box */}
        <div className="space-y-2 rounded-xl border border-slate-200/80 bg-slate-50 p-3">
          <div className="flex items-center justify-between">
            <div className="flex min-w-0 items-center gap-2">
              <span className="font-display text-sm font-bold tracking-tight text-slate-900">
                {isOpen && orderNumber != null ? `Ticket ${padOrder(orderNumber)}` : 'New Ticket'}
              </span>
              <span className="text-xs text-slate-300">•</span>
              <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                <Icon name={orderType === 'DINE_IN' ? 'restaurant' : 'takeout_dining'} className="text-[13px] text-slate-500" />
                {orderType === 'DINE_IN' ? 'Dine-In' : 'Takeaway'}
              </span>
            </div>
            {isOpen && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-live-border bg-live-light px-2.5 py-0.5 text-[11px] font-bold text-primary-dark">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
                Open Bill
              </span>
            )}
          </div>
          <div className="flex items-center justify-between gap-2 border-t border-slate-200/60 pt-1 text-xs text-slate-500">
            <div className="flex min-w-0 items-center gap-1.5">
              <Icon name="calendar_month" className="text-[15px] text-slate-400" />
              <span className="font-medium">{isOpen ? formatDateTime(createdAt) : todayLabel}</span>
            </div>
            <div className="flex items-center gap-1 tabular-nums">
              <Icon name="schedule" className="text-[13px] text-primary" />
              <span className="font-semibold">{isOpen && createdAt ? new Date(createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) : timeLabel}</span>
            </div>
          </div>
          <div className="flex items-center justify-between gap-2 border-t border-slate-200/60 pt-1 text-xs text-slate-500">
            <div className="flex min-w-0 items-center gap-1.5">
              <Icon name="person" className="text-[15px] text-slate-400" />
              <span className="truncate font-semibold text-slate-800">{customerName.trim() || 'No name yet'}</span>
            </div>
            {customerGender && (
              <div className="flex items-center gap-1 text-[11px] text-slate-400">
                <Icon name={customerGender === 'L' ? 'male' : 'female'} className="text-[13px] text-primary" />
                <span>{customerGender === 'L' ? 'Male' : 'Female'}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Scrollable form + items */}
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        {/* Segmented toggle Dine In / Takeaway */}
        <div className="space-y-1.5">
          <label className="block font-display text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Order Type
          </label>
          <div className="grid grid-cols-2 gap-2 rounded-xl border border-slate-200/60 bg-slate-100/90 p-1">
            {(['DINE_IN', 'TAKE_AWAY'] as OrderType[]).map((t) => {
              const active = orderType === t
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setOrderType(t)}
                  className={cn(
                    'flex items-center justify-center gap-1.5 rounded-lg py-2 px-3 font-display text-xs transition-all duration-150 active:scale-[0.98]',
                    active
                      ? 'border border-slate-200/60 bg-white font-bold text-primary-dark shadow-xs'
                      : 'font-semibold text-slate-600 hover:bg-white/50 hover:text-slate-900',
                  )}
                >
                  <Icon
                    name={t === 'DINE_IN' ? 'restaurant' : 'takeout_dining'}
                    className={cn('text-[16px]', active ? 'text-primary' : 'text-slate-400')}
                  />
                  {t === 'DINE_IN' ? 'Dine In' : 'Takeaway'}
                </button>
              )
            })}
          </div>
        </div>

        {/* Customer name (wajib) */}
        <div className="space-y-1.5">
          <label className="block font-display text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Customer Name <span className="text-rose-600">*</span>
          </label>
          <Input
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="Customer name (required)"
            className={cn('h-10 rounded-xl border-slate-200 bg-white text-xs', nameMissing && 'border-destructive/70 focus-visible:border-destructive')}
            aria-invalid={nameMissing}
          />
          {nameMissing && (
            <p className="text-[11px] font-medium text-destructive">
              Customer name is required before saving.
            </p>
          )}
        </div>

        {/* Quick gender selector */}
        <div className="space-y-1.5">
          <label className="block font-display text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Demografi (Gender)
          </label>
          <div className="grid grid-cols-2 gap-2">
            {GENDERS.map((opt) => {
              const active = customerGender === opt.v
              return (
                <button
                  key={opt.v}
                  type="button"
                  onClick={() => setCustomerGender(opt.v)}
                  className={cn(
                    'flex items-center justify-center gap-2 rounded-xl border px-3 py-2 font-display text-xs shadow-xs transition-all duration-150 active:scale-95',
                    active
                      ? 'border-primary bg-live-light font-bold text-primary-dark'
                      : 'border-slate-200 bg-white font-semibold text-slate-700 hover:bg-slate-50',
                  )}
                >
                  <Icon name={opt.glyph} className={cn('text-base shrink-0', active ? 'text-primary' : 'text-slate-400')} />
                  <span>{opt.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Daftar item keranjang */}
        <div className="space-y-2 border-t border-slate-100 pt-1">
          <div className="flex items-center justify-between pb-0.5">
            <span className="font-display text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Selected Items ({itemCount})
            </span>
            {items.length > 0 && (
              <button
                type="button"
                onClick={onClearCart}
                className="flex items-center gap-1 rounded-lg p-1 text-xs font-semibold text-rose-600 transition-colors hover:bg-rose-50"
                title="Clear all"
              >
                <Icon name="delete" className="text-base" />
                Clear all
              </button>
            )}
          </div>

          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center space-y-2 rounded-2xl border-2 border-dashed border-slate-200/80 bg-slate-50/70 p-6 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-primary shadow-xs">
                <Icon name="shopping_bag" className="text-lg" />
              </div>
              <p className="font-display text-xs font-bold text-slate-800">No items yet</p>
              <p className="max-w-[200px] text-[11px] text-slate-500">
                Pick items from the menu catalog to add to this order.
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
      </div>

      {/* Footer ringkasan + aksi */}
      <div className="shrink-0 space-y-3.5 border-t border-slate-200/80 bg-white p-4">
        <div className="space-y-2.5">
          <div className="pb-0.5">
            <span className="font-display text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Order Summary
            </span>
          </div>
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center justify-between text-slate-500">
              <span>Subtotal</span>
              <span className="font-medium tabular-nums text-slate-700">{formatRupiah(subtotal)}</span>
            </div>
            <div className="mt-2 flex items-center justify-between border-t border-slate-200/80 pt-2.5">
              <div className="flex flex-col">
                <span className="font-display text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Grand Total
                </span>
                <span className="text-[10px] font-medium text-slate-400">{itemCount} items</span>
              </div>
              <span className="font-display text-2xl font-extrabold tabular-nums tracking-tight text-slate-900">
                {formatRupiah(subtotal)}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-2 pt-1">
          {validationError && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-[11px] font-semibold text-destructive">
              {validationError}
            </p>
          )}
          <button
            type="button"
            onClick={onPay}
            className="flex h-12 w-full items-center justify-between rounded-xl border border-primary-dark px-4 text-sm font-bold text-white shadow-btn-bismark transition-all duration-200 hover:brightness-105 active:scale-[0.99]"
            style={{ background: 'linear-gradient(135deg, #447C84 0%, #53949e 100%)' }}
          >
            <span className="flex items-center gap-2">
              <Icon name="payments" className="text-xl" />
              <span className="font-display font-extrabold tracking-wide">Pay Now</span>
            </span>
            <span className="font-display text-[15px] font-extrabold tabular-nums tracking-wide">
              {formatRupiah(subtotal)}
            </span>
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={onSaveOpenBill}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 shadow-xs transition active:scale-95 hover:bg-slate-100 disabled:pointer-events-none disabled:opacity-60"
          >
            <Icon name="receipt_long" className="text-base text-slate-500" />
            {saving ? 'Saving...' : 'Save Open Bill'}
          </button>
        </div>
      </div>
    </div>
  )
}

/** Baris item keranjang gaya desain: nama + @harga, chip catatan, stepper qty (− jadi trash saat qty=1). */
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
    <div className="space-y-2 rounded-xl border border-slate-200/80 bg-white p-3 shadow-xs transition hover:border-primary">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h4 className="text-xs font-bold leading-tight text-slate-900">{item.product.name}</h4>
          <p className="mt-0.5 text-[11px] font-medium tabular-nums text-slate-500">
            @ {formatRupiah(item.product.price)}
          </p>
        </div>
        <span className="text-xs font-bold tabular-nums text-slate-900">
          {formatRupiah(item.product.price * item.quantity)}
        </span>
      </div>
      <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-1.5 text-[11px]">
        <input
          value={item.notes ?? ''}
          onChange={(e) => onSetNotes(item.id, e.target.value)}
          placeholder="+ Add note"
          className="min-w-0 flex-1 rounded-md border border-live-border bg-live-light px-2 py-0.5 text-[10px] font-medium text-primary-dark placeholder:font-normal placeholder:text-primary-dark/60 focus:outline-none focus:ring-1 focus:ring-primary/40"
        />
        <div className="flex shrink-0 items-center gap-1.5">
          {item.quantity <= 1 ? (
            <button
              type="button"
              onClick={() => onRemoveItem(item.id)}
              className="flex h-6 w-6 items-center justify-center rounded-md border border-rose-200 bg-white text-rose-600 transition hover:bg-rose-50 active:scale-90"
              title="Delete Item"
              aria-label="Remove item"
            >
              <Icon name="delete" className="text-[13px]" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onDecrease(item.id)}
              className="flex h-6 w-6 items-center justify-center rounded-md border border-slate-200 bg-white font-bold text-slate-700 transition hover:bg-slate-100 active:scale-90"
              aria-label="Decrease quantity"
            >
              <Icon name="remove" className="text-[13px]" />
            </button>
          )}
          <span className="w-4 text-center text-xs font-bold tabular-nums text-slate-900">{item.quantity}</span>
          <button
            type="button"
            onClick={() => onIncrease(item.id)}
            className="flex h-6 w-6 items-center justify-center rounded-md border border-slate-200 bg-white font-bold text-slate-700 transition hover:bg-slate-100 active:scale-90"
            aria-label="Increase quantity"
          >
            <Icon name="add" className="text-[13px]" />
          </button>
        </div>
      </div>
    </div>
  )
}
