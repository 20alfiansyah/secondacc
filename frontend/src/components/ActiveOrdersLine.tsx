import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Coffee, Search, X } from 'lucide-react'
import type { OrderSummary, OrderType } from '@/api/client'
import { cn } from '@/lib/utils'
import { formatRupiah } from '@/utils/format'
import { Input } from '@/components/ui/input'

type OrderFilter = 'all' | OrderType

const TYPE_LABEL: Record<OrderType, string> = {
  DINE_IN: 'Dine In',
  TAKE_AWAY: 'Takeaway',
}

const FILTERS: { value: OrderFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'DINE_IN', label: 'Dine In' },
  { value: 'TAKE_AWAY', label: 'Takeaway' },
]

const SCROLL_STEP = 300

/** Nomor Order dengan padding nol minimal 3 digit: 45 -> "#045". */
function orderLabel(id: number): string {
  return `#${String(id).padStart(3, '0')}`
}

/**
 * Zone 2 — Top: Persistent Active Orders Line.
 * Header (judul + count + pencarian by Order ID / nama pelanggan), filter pills
 * All / Dine In / Takeaway, dan carousel horizontal 1-baris dengan panah navigasi.
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
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<OrderFilter>('all')
  const scrollerRef = useRef<HTMLDivElement>(null)
  const [canLeft, setCanLeft] = useState(false)
  const [canRight, setCanRight] = useState(false)

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

  function updateArrows() {
    const el = scrollerRef.current
    if (!el) return
    setCanLeft(el.scrollLeft > 4)
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
  }

  useEffect(() => {
    updateArrows()
    window.addEventListener('resize', updateArrows)
    return () => window.removeEventListener('resize', updateArrows)
  }, [filteredOrders])

  function scrollBy(dir: 1 | -1) {
    scrollerRef.current?.scrollBy({ left: dir * SCROLL_STEP, behavior: 'smooth' })
  }

  return (
    <section className="mb-4">
      {/* Header: judul + count + pencarian */}
      <div className="mb-3 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Coffee className="h-4 w-4" />
          </div>
          <h2 className="text-sm font-bold tracking-tight text-foreground">Active Orders</h2>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary tabular-nums">
            {orders.length}
          </span>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search orders..."
            className="h-9 rounded-xl bg-card pl-9 pr-8 text-sm shadow-subtle border-border/80"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              aria-label="Bersihkan pencarian"
              className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Filter pills */}
      <div className="mb-3 flex items-center gap-1.5">
        {FILTERS.map((pill) => {
          const isActive = filter === pill.value
          return (
            <button
              key={pill.value}
              onClick={() => setFilter(pill.value)}
              className={cn(
                'flex h-11 items-center rounded-full border px-4 text-sm font-semibold transition-all duration-150 active:scale-[0.97]',
                isActive
                  ? 'border-primary bg-primary text-primary-foreground shadow-xs'
                  : 'border-border/80 bg-card text-muted-foreground hover:border-border hover:bg-accent hover:text-foreground',
              )}
            >
              {pill.label}
            </button>
          )
        })}
      </div>

      {/* Carousel 1-baris dengan panah saat overflow */}
      <div className="group/line relative">
        <button
          onClick={() => scrollBy(-1)}
          disabled={!canLeft}
          aria-label="Geser ke kiri"
          className="absolute -left-3 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-border/80 bg-card text-muted-foreground shadow-subtle transition-all duration-150 hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-0 md:flex"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <div
          ref={scrollerRef}
          onScroll={updateArrows}
          className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-none"
        >
          {filteredOrders.length === 0 ? (
            <div className="flex w-full items-center gap-3 rounded-2xl border border-dashed border-border/70 bg-background/40 px-4 py-3 text-muted-foreground">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted/60 text-muted-foreground/60">
                <Coffee className="h-4 w-4" />
              </div>
              <p className="text-xs">Belum ada order berjalan.</p>
            </div>
          ) : (
            filteredOrders.map((order) => {
              const isActive = activeOrderId === order.id
              return (
                <button
                  key={order.id}
                  onClick={() => onSelect(order.id)}
                  className={cn(
                    'group relative flex min-w-[200px] shrink-0 flex-col gap-1 rounded-2xl border p-3.5 text-left shadow-subtle transition-all duration-150 active:scale-[0.98]',
                    isActive
                      ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                      : 'border-border/70 bg-card hover:border-primary/40 hover:shadow-card',
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-foreground tabular-nums">
                      Order {orderLabel(order.id)}
                    </span>
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-[10px] font-bold',
                        order.orderType === 'TAKE_AWAY'
                          ? 'bg-primary/10 text-primary'
                          : 'bg-muted text-muted-foreground',
                      )}
                    >
                      {TYPE_LABEL[order.orderType]}
                    </span>
                  </div>

                  <p className="truncate text-xs font-semibold text-muted-foreground">
                    {order.customerName?.trim() || 'Pelanggan'}
                  </p>

                  <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                    <span className="font-semibold tabular-nums">{order.itemCount} item</span>
                    <span className="font-bold text-foreground tabular-nums">
                      {formatRupiah(order.grandTotal)}
                    </span>
                  </div>
                </button>
              )
            })
          )}
        </div>

        <button
          onClick={() => scrollBy(1)}
          disabled={!canRight}
          aria-label="Geser ke kanan"
          className="absolute -right-3 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-border/80 bg-card text-muted-foreground shadow-subtle transition-all duration-150 hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-0 md:flex"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </section>
  )
}
