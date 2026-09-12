import { useEffect, useMemo, useState } from 'react'
import type { OrderSummary, OrderType } from '@/api/client'
import { cn } from '@/lib/utils'
import { formatRupiah } from '@/utils/format'
import { SearchInput } from '@/components/ui/SearchInput'
import { Section } from '@/components/ui/Section'
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

/** Nomor Order dengan padding nol minimal 3 digit: 45 -> "#045". */
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
 * Zone 2 — Active Tickets (Stitch design): section card collapsible berisi
 * header (judul + count "N Active" + subtitle + toggle), filter tabs All /
 * Dine-In / Takeaway dengan count badge, pencarian order, dan grid tiket
 * (md:grid-cols-3) menggantikan carousel. Klik kartu memuat pesanan ke panel
 * Order Details (callback ke parent).
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
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<OrderFilter>('all')
  const [open, setOpen] = useState(true)

  // Re-render tiap 30 detik agar label "Just now / 15m ago" tetap akurat.
  const [nowMs, setNowMs] = useState(() => Date.now())
  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 30_000)
    return () => window.clearInterval(timer)
  }, [])

  const filteredOrders = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/^#/, '')
    return orders.filter((o) => {
      if (filter !== 'all' && o.orderType !== filter) return false
      if (!q) return true
      return (
        String(o.id).padStart(3, '0').includes(q) ||
        (o.customerName ?? '').toLowerCase().includes(q)
      )
    })
  }, [orders, query, filter])

  const countBy = (value: OrderFilter): number =>
    value === 'all' ? orders.length : orders.filter((o) => o.orderType === value).length

  return (
    <Section
      icon="receipt_long"
      title="Active Tickets"
      subtitle="Live ticket queue & status"
      badge={
        <span className="flex items-center gap-1.5 rounded-full border border-live-border bg-live-light px-2 py-0.5 text-[11px] font-semibold text-primary-dark tabular-nums">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-live" />
          {orders.length} Active
        </span>
      }
      right={
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          title={open ? 'Collapse Active Tickets' : 'Expand Active Tickets'}
          aria-expanded={open}
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-border text-slate-500 shadow-xs transition active:scale-95 hover:bg-secondary hover:text-foreground"
        >
          <Icon name={open ? 'expand_less' : 'expand_more'} className="text-[18px]" />
        </button>
      }
      bodyClassName={cn(!open && 'hidden')}
      className="shrink-0"
    >
      {/* Filter tabs bar + search */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {FILTERS.map((tab) => {
            const isActive = filter === tab.value
            return (
              <button
                key={tab.value}
                onClick={() => setFilter(tab.value)}
                className={cn(
                  'flex shrink-0 items-center gap-2 rounded-lg px-3 py-1.5 text-xs shadow-xs transition-all duration-150 active:scale-[0.97]',
                  isActive
                    ? 'bg-primary font-semibold text-primary-foreground'
                    : 'border border-border bg-card font-medium text-slate-600 hover:bg-secondary hover:text-foreground',
                )}
              >
                <span>{tab.label}</span>
                <span
                  className={cn(
                    'rounded px-1.5 py-0.5 text-[10px] font-bold tabular-nums',
                    isActive ? 'bg-primary-dark text-white' : 'bg-slate-100 text-slate-600',
                  )}
                >
                  {countBy(tab.value)}
                </span>
              </button>
            )
          })}
        </div>
        <div className="ml-auto w-full max-w-[260px]">
          <SearchInput
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search orders by ID or customer..."
          />
        </div>
      </div>

      {/* Ticket cards grid */}
      <div className="grid grid-cols-1 gap-3 rounded-xl bg-secondary/40 p-3 md:grid-cols-2 xl:grid-cols-3">
        {filteredOrders.length === 0 ? (
          <div className="col-span-full flex items-center gap-3 rounded-xl border border-dashed border-border bg-card/60 px-4 py-4 text-muted-foreground">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted/60 text-muted-foreground/60">
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
                  'group relative flex cursor-pointer flex-col justify-between rounded-xl border p-3.5 text-left shadow-xs transition-all duration-150 active:scale-[0.98]',
                  isActive
                    ? 'border-2 border-primary bg-white hover:bg-primary-light/40'
                    : 'border-border bg-white hover:border-slate-300 hover:bg-secondary/60',
                )}
              >
                {/* OPEN BILL pill di tepi atas kartu */}
                <span className="absolute -top-2.5 right-3 flex items-center gap-1.5 rounded-full border border-live-border bg-live-light px-2.5 py-0.5 font-display text-[9px] font-bold uppercase tracking-wider text-primary shadow-xs">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
                  Open Bill
                </span>

                <div>
                  <div className="mb-2 flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={cn(
                          'rounded-md px-2 py-0.5 text-xs font-bold tracking-wide tabular-nums',
                          isActive
                            ? 'bg-primary text-white'
                            : 'border border-border bg-slate-100 text-slate-800',
                        )}
                      >
                        {orderLabel(order.id)}
                      </span>
                      <span className="rounded border border-border bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold text-slate-700">
                        {TYPE_LABEL[order.orderType]}
                      </span>
                    </div>
                    <span className="flex items-center gap-0.5 text-[10px] text-slate-400">
                      <Icon name="schedule" className="text-[13px]" />
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

                <div className="-mx-3.5 -mb-3.5 mt-3 flex items-center justify-between rounded-b-[10px] border-t border-slate-100 bg-slate-50/70 px-3.5 py-2.5">
                  <span className="font-display text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Total Due
                  </span>
                  <span
                    className={cn(
                      'text-sm font-bold tabular-nums tracking-tight',
                      isActive ? 'text-primary-dark' : 'text-slate-900',
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
    </Section>
  )
}
