import { useEffect, useMemo, useState } from 'react'
import type { CustomerGender, OrderType, Product } from '@/api/client'
import { cn } from '@/lib/utils'
import { formatRupiah } from '@/utils/format'
import Icon from '@/components/ui/Icon'
import EmptyState from '@/components/ui/EmptyState'

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
  /** Mulai order baru dari panel (mode open). */
  onNewOrder: () => void
  onPay: () => void
  onSaveOpenBill: () => void
  saving: boolean
  /** Error validasi simpan (nama kosong). */
  validationError: string | null
}

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

/* Inline stroke SVG (Stitch spec screen3) */
function CalendarIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3.5 w-3.5 text-slate-400"
    >
      <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  )
}

function ClockIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3.5 w-3.5 text-slate-400"
    >
      <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" x2="10" y1="11" y2="17" />
      <line x1="14" x2="14" y1="11" y2="17" />
    </svg>
  )
}

const GENDERS: { v: CustomerGender; label: string }[] = [
  { v: 'L', label: 'Male (L)' },
  { v: 'P', label: 'Female (P)' },
]

function GenderIcon({ value, active }: { value: CustomerGender; active: boolean }) {
  const cls = cn('h-4 w-4', active ? 'text-[#447C84]' : 'text-slate-400')
  if (value === 'L') {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={cls}
        aria-hidden="true"
      >
        <circle cx="10" cy="14" r="5" />
        <path d="M19 5l-5.4 5.4" />
        <path d="M15 5h4v4" />
      </svg>
    )
  }
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cls}
      aria-hidden="true"
    >
      <circle cx="12" cy="9" r="5" />
      <path d="M12 14v7" />
      <path d="M9 18h6" />
    </svg>
  )
}

const TYPE_OPTIONS: { value: OrderType; label: string; icon: string }[] = [
  { value: 'DINE_IN', label: 'Dine In', icon: 'restaurant' },
  { value: 'TAKE_AWAY', label: 'Takeaway', icon: 'takeout_dining' },
]

/**
 * Zone 3 — Right Order Details Panel (Stitch screen3 markup 1:1).
 *
 * Struktur persis spec: header (receipt_long + New Order/Ticket + info row
 * tanggal/jam), form order type + customer + gender (SVG strokeline), daftar
 * SELECTED ITEMS (kartu item, chip notes + "+ Edit notes" toggle, stepper
 * teks −/+), dan footer ORDER SUMMARY (Subtotal, Resto Tax PB1 10%, Grand
 * Total) + CTA Pay Now solid + Save Open Bill.
 *
 * CATATAN: Resto Tax (PB1 10%) = display-only (Math.round(subtotal * 0.1));
 * backend belum menghitung tax pada checkout — payload tetap subtotal.
 */
export default function OrderDetailsPanel({
  mode,
  orderNumber,
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
  onPay,
  onNewOrder,
  onSaveOpenBill,
  saving,
  validationError,
}: OrderDetailsPanelProps) {
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null)
  const [notesDraft, setNotesDraft] = useState('')

  const subtotal = useMemo(() => items.reduce((sum, l) => sum + l.product.price * l.quantity, 0), [items])
  // Display-only: backend belum menghitung PB1 — grand total visual = subtotal + tax,
  // payload checkout tetap subtotal.
  const tax = Math.round(subtotal * 0.1)
  const grandTotalDisplay = subtotal + tax
  const hasItems = items.length > 0

  // Auto-cancel notes editor saat item/panel berubah radikal (items berubah).
  useEffect(() => {
    if (editingNotesId && !items.some((l) => l.id === editingNotesId)) {
      setEditingNotesId(null)
    }
  }, [items, editingNotesId])

  function beginEditNotes(line: OrderLine) {
    setEditingNotesId(line.id)
    setNotesDraft(line.notes ?? '')
  }

  function commitNotes(id: string) {
    onSetNotes(id, notesDraft.trim())
    setEditingNotesId(null)
  }

  const isOpen = mode === 'open' && orderNumber !== null

  return (
    <>
      {/* ===== Panel header ===== */}
      <div className="space-y-3 flex-shrink-0 border-b border-slate-100 p-4">
        <div className={cn('flex items-center justify-between', isOpen && 'border-b border-slate-100 pb-2.5')}>
          <div className="flex items-center gap-2">
            <Icon name="receipt_long" className={cn('text-[#447C84]', isOpen ? 'text-lg' : 'text-[20px]')} />
            <h2
              className={cn(
                'font-display text-xs font-bold uppercase tracking-wider',
                isOpen ? 'text-slate-800' : 'text-slate-900',
              )}
            >
              {isOpen ? 'ORDER DETAILS' : 'New Order'}
            </h2>
          </div>
          {isOpen && (
            <button
              type="button"
              onClick={onNewOrder}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-[#447C84] px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-all active:scale-95 hover:bg-[#396a71]"
            >
              <Icon name="add" className="text-sm" />
              New Order
            </button>
          )}
        </div>
        {isOpen ? (
          <div className="space-y-2 rounded-xl border border-slate-200/80 bg-slate-50 p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-display text-sm font-bold tracking-tight text-slate-900">
                  Ticket {padOrder(orderNumber!)}
                </span>
                <span className="text-xs text-slate-300">•</span>
                <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                  <Icon name={orderType === 'DINE_IN' ? 'restaurant' : 'takeout_dining'} className="text-[13px] text-slate-500" />
                  {orderType === 'DINE_IN' ? 'Dine-In' : 'Takeaway'}
                </span>
              </div>
              <div className="inline-flex items-center gap-1.5 rounded-full border border-[#b9e2d3] bg-[#edf7f3] px-2.5 py-0.5 text-[11px] font-bold text-[#2d5258]">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#447C84]" />
                Open Bill
              </div>
            </div>
            <div className="flex items-center justify-between border-t border-slate-200/60 pt-1 text-xs text-slate-500">
              <div className="flex min-w-0 items-center gap-1.5">
                <Icon name="person" className="text-[15px] text-slate-400" />
                <span className="truncate font-semibold text-slate-800">{customerName.trim() || 'Walk-in'}</span>
              </div>
              {customerGender && (
                <div className="flex items-center gap-1 text-[11px] text-slate-400">
                  <GenderIcon value={customerGender} active />
                  <span>{customerGender === 'L' ? 'Laki-laki' : 'Perempuan'}</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-slate-50 px-3 py-2 text-xs text-slate-600">
            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
              <CalendarIcon />
              <span>{formatDateTime(new Date().toISOString())}</span>
            </div>
            <div className="flex items-center gap-1 text-xs font-medium text-slate-500">
              <ClockIcon />
              <span>
                {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ===== Body: scrollable form + item list ===== */}
      <div className="flex min-h-0 flex-1 flex-col space-y-4 overflow-y-auto p-4">
        {!isOpen && (
        <>
        {/* Order Type segmented control */}
        <div className="space-y-1.5">
          <label className="font-display text-[10px] font-bold uppercase tracking-wider text-slate-400">
            ORDER TYPE
          </label>
          <div className="grid grid-cols-2 gap-2 rounded-xl border border-slate-200/60 bg-slate-100/90 p-1">
            {TYPE_OPTIONS.map((opt) => {
              const isActive = orderType === opt.value
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setOrderType(opt.value)}
                  className={cn(
                    'flex cursor-pointer items-center justify-center gap-1.5 rounded-lg px-3 py-2 font-display text-xs transition',
                    isActive
                      ? 'border border-slate-200/60 bg-white font-bold text-[#2d5258] shadow-xs'
                      : 'font-semibold text-slate-600 hover:bg-white/50 hover:text-slate-900',
                  )}
                >
                  <Icon
                    name={opt.icon}
                    className={cn('text-[16px]', isActive ? 'text-[#447C84]' : 'text-slate-400')}
                  />
                  {opt.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Customer Name */}
        <div className="space-y-1.5">
          <label className="flex items-center justify-between font-display text-[10px] font-bold uppercase tracking-wider text-slate-400">
            <span>
              CUSTOMER NAME <span className="text-rose-600">*</span>
            </span>
          </label>
          <div className="relative">
            <input
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value.slice(0, 40))}
              placeholder="Customer name (required)"
              type="text"
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-900 shadow-xs transition placeholder:text-slate-400 focus:border-[#447C84] focus:outline-none focus:ring-2 focus:ring-[#447C84]/30"
            />
          </div>
        </div>

        {/* Demografi (Gender) */}
        <div className="space-y-1.5">
          <label className="font-display text-[10px] font-bold uppercase tracking-wider text-slate-400">
            DEMOGRAFI (GENDER)
          </label>
          <div className="grid grid-cols-2 gap-2">
            {GENDERS.map((g) => {
              const active = customerGender === g.v
              return (
                <button
                  key={g.v}
                  type="button"
                  onClick={() => setCustomerGender(active ? null : g.v)}
                  className={cn(
                    'flex cursor-pointer items-center justify-center gap-2 rounded-xl border px-3 py-2 font-display text-xs transition',
                    active
                      ? 'border-[#447C84] bg-[#edf7f3] font-bold text-[#2d5258] shadow-xs'
                      : 'border-slate-200 bg-white font-semibold text-slate-700 shadow-xs hover:bg-slate-50',
                  )}
                >
                  <GenderIcon value={g.v} active={active} />
                  {g.label}
                </button>
              )
            })}
          </div>
        </div>
        </>
        )}
        {/* Selected Items */}
        <div className="flex flex-1 flex-col space-y-2.5 border-t border-slate-100 pt-1">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400 font-display pb-0.5">
            <span>Selected Items ({items.reduce((sum, l) => sum + l.quantity, 0)})</span>
            {hasItems && (
              <button
                type="button"
                onClick={onClearCart}
                title="Clear all items"
                aria-label="Clear all items"
                className="flex cursor-pointer items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-rose-600 transition-colors hover:bg-rose-50 hover:text-rose-600"
              >
                <TrashIcon className="h-3.5 w-3.5" />
                <span className="text-[11px] font-semibold text-rose-600">Clear all</span>
              </button>
            )}
          </div>

          {!hasItems ? (
            <EmptyState fill icon="shopping_bag" title="No items yet" description="Pick items from the menu catalog to add to this order." />
          ) : (
            <div className="space-y-2.5">
              {items.map((line) => (
                <div
                  key={line.id}
                  className="group space-y-2.5 rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-xs transition hover:border-[#447C84]"
                >
                  {/* Header row: nama + @price kiri, tombol hapus kanan */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold leading-tight text-slate-900">
                        {line.product.name}
                      </h4>
                      <p className="mt-0.5 text-[11px] tabular-nums text-slate-400">
                        @ {formatRupiah(line.product.price)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onRemoveItem(line.id)}
                      title="Remove item"
                      aria-label="Remove item"
                      className="flex cursor-pointer items-center justify-center rounded-lg p-1 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>

                  {editingNotesId === line.id ? (
                    <div className="flex w-full items-center gap-1">
                      <input
                        autoFocus
                        value={notesDraft}
                        onChange={(e) => setNotesDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') commitNotes(line.id)
                          if (e.key === 'Escape') setEditingNotesId(null)
                        }}
                        onBlur={() => commitNotes(line.id)}
                        placeholder="e.g. less sugar, no ice…"
                        className="h-7 w-full rounded-md border border-slate-200 bg-white px-2 text-[11px] text-slate-800 focus:border-[#447C84] focus:outline-none focus:ring-1 focus:ring-[#447C84]/30"
                      />
                    </div>
                  ) : (
                    <>
                      {/* Baris catatan: chip + "+ Edit notes" / "+ Add notes" */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        {line.notes?.trim() && (
                          <button
                            type="button"
                            onClick={() => beginEditNotes(line)}
                            title="Edit notes"
                            className="max-w-[60%] cursor-pointer truncate rounded-md border border-[#b9e2d3] bg-[#edf7f3] px-2 py-0.5 text-[10px] font-medium text-[#2d5258]"
                          >
                            {line.notes}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => beginEditNotes(line)}
                          className="cursor-pointer text-[10px] font-medium text-slate-500 transition hover:text-[#447C84]"
                        >
                          {line.notes?.trim() ? '+ Edit notes' : '+ Add notes'}
                        </button>
                      </div>

                      {/* Baris total: line total kiri, stepper kanan */}
                      <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-[11px]">
                        <span className="text-xs font-bold tabular-nums text-slate-900">
                          {formatRupiah(line.product.price * line.quantity)}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onDecrease(line.id)}
                            className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-md border border-slate-200 bg-white text-xs font-bold tabular-nums text-slate-700 transition hover:bg-slate-100"
                          >
                            -
                          </button>
                          <span className="w-4 text-center text-xs font-bold tabular-nums text-slate-900">
                            {line.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => onIncrease(line.id)}
                            className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-md border border-slate-200 bg-white text-xs font-bold tabular-nums text-slate-700 transition hover:bg-slate-100"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ===== Footer: summary + CTAs ===== */}
      <div className="flex-shrink-0 space-y-3.5 border-t border-slate-200/80 bg-white p-4">
        <div className="space-y-2.5">
          {!isOpen && (
          <div className="flex items-center justify-between pb-0.5">
            <span className="font-display text-[10px] font-bold uppercase tracking-wider text-slate-400">
              ORDER SUMMARY
            </span>
            {validationError && (
              <span className="text-[10px] font-semibold text-destructive">{validationError}</span>
            )}
          </div>
          )}
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center justify-between text-slate-500">
              <span>Subtotal</span>
              <span className={cn('font-medium tabular-nums', isOpen ? 'text-slate-900' : 'text-slate-700')}>{formatRupiah(subtotal)}</span>
            </div>
            {/* Display-only: backend belum menghitung PB1 — payload checkout tetap subtotal. */}
            <div className="flex items-center justify-between text-slate-500">
              <span>Resto Tax (PB1 10%)</span>
              <span className={cn('font-medium tabular-nums', isOpen ? 'text-slate-900' : 'text-slate-700')}>{formatRupiah(tax)}</span>
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between border-t border-slate-200/80 pt-2.5">
            <div className="flex flex-col">
              <span className="font-display text-[11px] font-bold uppercase tracking-wider text-slate-500">
                GRAND TOTAL
              </span>
              <span className="text-[10px] font-medium text-slate-400">
                {items.reduce((sum, l) => sum + l.quantity, 0)} items{isOpen && ' included'}
              </span>
            </div>
            <div className="font-display text-2xl font-extrabold tabular-nums tracking-tight text-slate-900">
              {formatRupiah(grandTotalDisplay)}
            </div>
          </div>
        </div>
        <div className="space-y-2 pt-1">
          <button
            type="button"
            disabled={!hasItems || saving}
            onClick={onPay}
            style={isOpen ? { background: 'linear-gradient(135deg, #447C84 0%, #53949e 100%)' } : undefined}
            className={cn(
              'group flex h-12 w-full cursor-pointer items-center justify-between rounded-xl border border-[#396a71] px-4 text-sm text-white shadow-btn-bismark transition-all duration-200 hover:brightness-105 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none',
              isOpen ? 'font-semibold' : 'bg-[#447C84] font-bold',
            )}
          >
            <div className="flex items-center gap-2">
              <Icon
                name="payments"
                className={cn('text-[20px]', isOpen && 'transition-transform group-hover:scale-110')}
              />
              <span className={cn('font-display tracking-wide text-white', isOpen ? 'font-extrabold' : 'font-bold')}>
                Pay Now
              </span>
            </div>
            <span
              className={cn(
                'font-display font-extrabold tabular-nums text-white',
                isOpen ? 'text-[15px] tracking-wide' : 'tracking-tight',
              )}
            >
              {formatRupiah(grandTotalDisplay)}
            </span>
          </button>
          <button
            type="button"
            disabled={saving || !hasItems}
            onClick={onSaveOpenBill}
            className="flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 shadow-xs transition active:scale-95 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Icon name="receipt" className="text-[16px] text-slate-500" />
            <span>{saving ? 'Saving…' : 'Save Open Bill'}</span>
          </button>
        </div>
      </div>
    </>
  )
}
