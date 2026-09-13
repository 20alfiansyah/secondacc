import { useEffect, useMemo, useState } from 'react'
import type { OrderSummary, OrderType } from '@/api/client'
import { cn } from '@/lib/utils'
import { formatRupiah } from '@/utils/format'
import Icon from '@/components/ui/Icon'

type OrderFilter = 'all' | OrderType

const TYPE_LABEL: Record<OrderType, string> = {
  DINE_IN: 'Dine-In',
  TAKE_AWAY: 'Takeaway',
}

const FILTERS: { value: OrderFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'DINE_IN', label: 'Dine-In' },
  { value: 'TAKE_AWAY', label: 'Takeaway' },
]

/** Nomor Order dengan padding nol minimal 3 digit: 42 -> "#042". */
function orderLabel(id: number): string {
  return `#${String(id).padStart(3, '0')}`
}

/** Relative time dari createdAt: "Just now", "15m ago", "3h ago". */
function relativeTime(createdAt: string, nowMs: number): string {
  const diffMin = Math.max(0, Math.floor((nowMs - new Date(createdAt).getTime()) / 60000))
  if (diffMin < 1) return 'Just now'
  if (diffMin < 60) return `${diffMin}m ago`
  return `${Math.floor(diffMin / 60)}h ago`
}

/**
 * Zone 2 — ACTIVE TICKETS section card (Stitch screen1 markup 1:1): header
 * (receipt_long + judul + divider + subtitle + toggle), filter tabs All /
 * Dine-In / Takeaway dengan count chip, dan grid tiket md:grid-cols-3.
 * Klik kartu memuat pesanan ke panel Order Details (callback ke parent).
 */
export default function ActiveOrdersLine({
  orders,
  activeOrderId,
  onSelect,
}: {
  orders: OrderSummary[]
  activeOrderId: number | null
  onSelect: (orderId: number) => void
}) {
  const [filter, setFilter] = useState<OrderFilter>('all')
  const [open, setOpen] = useState(true)

  // Re-render tiap 30 detik agar label "Just now / 15m ago" tetap akurat.
  const [nowMs, setNowMs] = useState(() => Date.now())
  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 30_000)
    return () => window.clearInterval(timer)
  }, [])

  const filteredOrders = useMemo(
    () => orders.filter((o) => filter === 'all' || o.orderType === filter),
    [orders, filter],
  )

  const countBy = (value: OrderFilter): number =>
    value === 'all' ? orders.length : orders.filter((o) => o.orderType === value).length

  return (
    <section className="space-y-3 flex-shrink-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-200">
      {/* Header band */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px] text-[#447C84]">
              receipt_long
            </span>
            <span className="font-display text-xs font-bold uppercase tracking-wider text-slate-900">
              ACTIVE TICKETS
            </span>
          </div>
          <div className="hidden h-4 w-px bg-slate-200 md:block" />
          <span className="hidden text-[11px] font-medium text-slate-500 md:inline-block">
            Live ticket queue &amp; status
          </span>
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          title="Toggle Active Tickets Tray"
          aria-expanded={open}
          className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg border border-slate-200 text-slate-500 shadow-xs transition active:scale-95 hover:bg-slate-100 hover:text-slate-900"
        >
          <span className="material-symbols-outlined text-[18px]">
            {open ? 'expand_less' : 'expand_more'}
          </span>
        </button>
      </div>

      {open && (
        <div className="space-y-3">
          {/* Filter tabs bar */}
          <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto">
            {FILTERS.map((tab) => {
              const isActive = filter === tab.value
              return (
                <button
                  key={tab.value}
                  onClick={() => setFilter(tab.value)}
                  className={cn(
                    'no-scrollbar flex flex-shrink-0 cursor-pointer items-center gap-2 rounded-lg px-3 py-1.5 text-xs shadow-xs transition',
                    isActive
                      ? 'bg-[#447C84] font-semibold text-white'
                      : 'border border-slate-200 bg-white font-medium text-slate-600 shadow-xs hover:bg-slate-50 hover:text-slate-900',
                  )}
                >
                  <span>{tab.label}</span>
                  <span
                    className={cn(
                      'rounded px-1.5 py-0.5 text-[10px] font-bold tabular-nums',
                      isActive ? 'bg-[#2d5258] text-white' : 'bg-slate-100 text-slate-600 font-semibold',
                    )}
                  >
                    {countBy(tab.value)}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Ticket cards grid */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {filteredOrders.length === 0 ? (
              <div className="col-span-full flex items-center gap-3 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-4 text-muted-foreground">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100/60 text-slate-400">
                  <Icon name="local_cafe" className="text-[16px]" />
                </div>
                <p className="text-xs">No tickets in the queue yet.</p>
              </div>
            ) : (
              filteredOrders.map((order) => {
                const isActive = activeOrderId === order.id
                return (
                  <button
                    key={order.id}
                    onClick={() => onSelect(order.id)}
                    className={cn(
                      'relative flex cursor-pointer flex-col justify-between rounded-xl p-3.5 text-left shadow-xs transition-all duration-150',
                      isActive
                        ? 'border-2 border-[#447C84] bg-white hover:bg-[#edf7f3]/40'
                        : 'border border-slate-200 bg-white shadow-xs hover:border-slate-300 hover:bg-slate-50',
                    )}
                  >
                    {/* OPEN BILL pill di tepi atas kartu */}
                    <span className="absolute -top-2.5 right-3 flex items-center gap-1.5 rounded-full border border-[#b9e2d3] bg-[#edf7f3] px-2.5 py-0.5 font-display text-[9px] font-bold uppercase tracking-wider text-[#447C84] shadow-xs">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#447C84]" />
                      Open Bill
                    </span>

                    <div>
                      <div className="mb-2 flex items-center justify-between gap-1.5">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={cn(
                              'rounded-md px-2 py-0.5 text-xs font-bold tracking-wide tabular-nums',
                              isActive
                                ? 'bg-[#447C84] text-white'
                                : 'border border-slate-200 bg-slate-100 text-slate-800',
                            )}
                          >
                            {orderLabel(order.id)}
                          </span>
                          <span className="rounded border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold text-slate-700">
                            {TYPE_LABEL[order.orderType]}
                          </span>
                        </div>
                        <span className="flex items-center gap-0.5 text-[10px] text-slate-400">
                          <span className="material-symbols-outlined text-[13px]">schedule</span>
                          {relativeTime(order.createdAt, nowMs)}
                        </span>
                      </div>
                      <h4
                        className={cn(
                          'truncate text-xs leading-snug tracking-tight',
                          isActive ? 'font-bold text-slate-900' : 'font-semibold text-slate-800',
                        )}
                      >
                        {order.customerName?.trim() || 'Walk-in'}
                      </h4>
                      <p className="mt-0.5 truncate text-[11px] text-slate-500">
                        {order.itemCount} items • {TYPE_LABEL[order.orderType]}
                      </p>
                    </div>

                    <div className="-mx-3.5 -mb-3.5 mt-3 flex items-center justify-between rounded-b-[10px] border-t border-slate-100 bg-white px-3.5 py-2.5">
                      <span className="font-display text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Total Due
                      </span>
                      <span
                        className={cn(
                          'text-sm font-bold tabular-nums tracking-tight',
                          isActive ? 'text-[#2d5258]' : 'text-slate-900',
                        )}
                      >
                        {formatRupiah(order.grandTotal)}
                      </span>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </section>
  )
}
