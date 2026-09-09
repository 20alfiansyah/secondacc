import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Coffee,
  Cookie,
  CupSoda,
  Filter,
  Flame,
  LayoutGrid,
  Sparkles,
  Star,
  Utensils,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Category, Product } from '@/api/client'
import { cn } from '@/lib/utils'
import { SearchInput } from '@/components/ui/SearchInput'

export type CategoryFilter = 'all' | 'recommended' | 'best-seller' | number
export type AvailabilityFilter = 'all' | 'available' | 'sold-out'
export type SortOption = 'default' | 'price-asc' | 'price-desc' | 'name-asc'

export const FILTER_LABEL: Record<AvailabilityFilter, string> = {
  all: 'All Status',
  available: 'Available',
  'sold-out': 'Sold Out',
}

export const SORT_LABEL: Record<SortOption, string> = {
  default: 'Default Order',
  'price-asc': 'Price: Low → High',
  'price-desc': 'Price: High → Low',
  'name-asc': 'Name: A → Z',
}

const SCROLL_STEP = 260

function pillIcon(name: string): LucideIcon {
  const lower = name.toLowerCase()
  if (lower.includes('kopi') || lower.includes('coffee')) return Coffee
  if (lower.includes('makan') || lower.includes('heavy') || lower.includes('food')) return Utensils
  if (lower.includes('snack') || lower.includes('cemilan') || lower.includes('roti')) return Cookie
  if (lower.includes('non') || lower.includes('drink') || lower.includes('tea') || lower.includes('soda'))
    return CupSoda
  return Sparkles
}

interface Pill {
  key: string
  label: string
  icon?: LucideIcon
  count: number
  value: CategoryFilter
}

/**
 * Zone 2 — Middle: Category Filter Bar & Overflow Handling (Task 1.3.5).
 * Kolom live-search (shortcut "/"), carousel pill kategori tinggi tetap ~42px
 * dengan panah < > saat overflow, dan popover grid 3 kolom untuk lompat ke
 * kategori mana pun dalam 1 klik. Pilihan pill & search di-lift ke parent POS
 * (state filter grid; grid itu sendiri di Task 1.3.6).
 */
export default function CategoryFilterBar({
  categories,
  products,
  activeCategory,
  onSelectCategory,
  search,
  onSearchChange,
  availabilityFilter,
  onAvailabilityChange,
  sortOption,
  onSortChange,
  activeOrdersCount,
  isQueueScrolledOut,
  onScrollToQueue,
  className,
}: {
  categories: Category[]
  products: Product[]
  activeCategory: CategoryFilter
  onSelectCategory: (c: CategoryFilter) => void
  search: string
  onSearchChange: (v: string) => void
  availabilityFilter: AvailabilityFilter
  onAvailabilityChange: (f: AvailabilityFilter) => void
  sortOption: SortOption
  onSortChange: (s: SortOption) => void
  activeOrdersCount?: number
  isQueueScrolledOut?: boolean
  onScrollToQueue?: () => void
  className?: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const scrollerRef = useRef<HTMLDivElement>(null)
  const [canLeft, setCanLeft] = useState(false)
  const [canRight, setCanRight] = useState(false)
  const [gridOpen, setGridOpen] = useState(false)

  const counts = useMemo(() => {
    const recommended = products.filter((p) => p.isRecommended).length
    const bestSeller = products.filter((p) => p.isBestSeller).length
    return { all: products.length, recommended, bestSeller }
  }, [products])

  const pills: Pill[] = useMemo(() => {
    const base: Pill[] = [
      { key: 'all', label: 'All', count: counts.all, value: 'all' },
      {
        key: 'recommended',
        label: 'Recommended',
        icon: Star,
        count: counts.recommended,
        value: 'recommended',
      },
      {
        key: 'best-seller',
        label: 'Best Seller',
        icon: Flame,
        count: counts.bestSeller,
        value: 'best-seller',
      },
    ]
    const dynamic = categories.map((c) => ({
      key: `cat-${c.id}`,
      label: c.name,
      icon: pillIcon(c.name),
      count: c.activeProductCount,
      value: c.id as CategoryFilter,
    }))
    return [...base, ...dynamic]
  }, [categories, counts])

  // Shortcut keyboard: "/" memfokus kolom pencarian (saat tidak sedang mengetik).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null
      const typing =
        target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      if (e.key === '/' && !typing) {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

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
  }, [pills])

  function scrollBy(dir: 1 | -1) {
    scrollerRef.current?.scrollBy({ left: dir * SCROLL_STEP, behavior: 'smooth' })
  }

  function select(value: CategoryFilter) {
    onSelectCategory(value)
    setGridOpen(false)
  }

  return (
    <div className={cn('mb-4 space-y-3.5', className)}>
      {/* Row: live search + toolbar selectors */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <SearchInput
          ref={inputRef}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search products..."
          hint="/"
          className="w-full max-w-[300px]"
        />

        <div className="flex items-center gap-1.5">
          {/* Compact Pill: Scroll back to queue when scrolled past */}
          {isQueueScrolledOut && activeOrdersCount && activeOrdersCount > 0 ? (
            <button
              type="button"
              onClick={onScrollToQueue}
              className="flex h-10 items-center gap-1.5 rounded-xl border border-primary/30 bg-primary/10 px-3 text-xs font-bold text-primary shadow-subtle transition-all duration-150 hover:bg-primary hover:text-primary-foreground active:scale-95 animate-in fade-in"
              title="Scroll to Active Orders Queue"
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
              </span>
              <span className="tabular-nums">{activeOrdersCount} in Queue</span>
              <ArrowUp className="h-3.5 w-3.5" />
            </button>
          ) : null}
          <div className="flex h-10 items-center gap-1 rounded-xl border border-border/80 bg-card px-2.5 shadow-subtle text-xs sm:text-sm">
            <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <select
              value={availabilityFilter}
              onChange={(e) => onAvailabilityChange(e.target.value as AvailabilityFilter)}
              className="bg-transparent text-xs sm:text-sm font-semibold text-foreground focus:outline-none cursor-pointer"
            >
              {(Object.keys(FILTER_LABEL) as AvailabilityFilter[]).map((k) => (
                <option key={k} value={k}>
                  {FILTER_LABEL[k]}
                </option>
              ))}
            </select>
          </div>

          <div className="flex h-10 items-center gap-1 rounded-xl border border-border/80 bg-card px-2.5 shadow-subtle text-xs sm:text-sm">
            <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <select
              value={sortOption}
              onChange={(e) => onSortChange(e.target.value as SortOption)}
              className="bg-transparent text-xs sm:text-sm font-semibold text-foreground focus:outline-none cursor-pointer"
            >
              {(Object.keys(SORT_LABEL) as SortOption[]).map((k) => (
                <option key={k} value={k}>
                  {SORT_LABEL[k]}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Carousel pill — tinggi tetap ~36px, panah saat overflow */}
      <div className="group/bar relative flex items-center">
        <button
          onClick={() => scrollBy(-1)}
          disabled={!canLeft}
          aria-label="Scroll categories left"
          className="absolute -left-3 top-1/2 z-20 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-border/80 bg-card text-muted-foreground shadow-subtle transition-all duration-150 hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-0 md:flex"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <div
          ref={scrollerRef}
          onScroll={updateArrows}
          className="flex h-10 items-center gap-2 overflow-x-auto scrollbar-none"
        >
          {pills.map((pill) => {
            const isActive = activeCategory === pill.value
            return (
              <button
                key={pill.key}
                onClick={() => select(pill.value)}
                className={cn(
                  'group flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition-all duration-150 active:scale-[0.97]',
                  isActive
                    ? 'border-primary shadow-sm bg-primary text-primary-foreground'
                    : 'border-border/80 bg-card text-muted-foreground hover:border-border hover:bg-accent hover:text-foreground',
                )}
              >
                {pill.icon && (
                  <span className={cn(isActive ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-foreground')}>
                    <pill.icon className="h-3.5 w-3.5" />
                  </span>
                )}
                <span className="whitespace-nowrap">{pill.label}</span>
                <span
                  className={cn(
                    'rounded-full px-1.5 py-0.2 text-[10px] font-bold tabular-nums',
                    isActive
                      ? 'bg-primary-foreground/20 text-primary-foreground'
                      : 'bg-muted text-muted-foreground',
                  )}
                >
                  {pill.count}
                </span>
              </button>
            )
          })}

          {/* Popover grid Categories di ujung baris */}
          <div className="relative shrink-0">
            <button
              onClick={() => setGridOpen((v) => !v)}
              className={cn(
                'flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition-all duration-150 active:scale-[0.97]',
                gridOpen
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border/80 bg-card text-muted-foreground hover:border-border hover:bg-accent hover:text-foreground',
              )}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span className="whitespace-nowrap">Categories</span>
              <ChevronRight
                className={cn('h-3.5 w-3.5 transition-transform duration-150', gridOpen && 'rotate-90')}
              />
            </button>

            {gridOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setGridOpen(false)} />
                <div className="absolute left-1/2 top-full z-40 mt-2 w-[300px] -translate-x-1/2 animate-in fade-in zoom-in-95 duration-150">
                  <div className="overflow-hidden rounded-2xl border border-border/70 bg-popover p-2 shadow-modal">
                    <div className="grid grid-cols-3 gap-1">
                      {categories.map((c) => {
                        const isActive = activeCategory === c.id
                        return (
                          <button
                            key={c.id}
                            onClick={() => select(c.id)}
                            className={cn(
                              'flex min-h-11 flex-col items-center justify-center gap-1 rounded-xl border px-1 py-2 text-center transition-all duration-150 active:scale-95',
                              isActive
                                ? 'border-primary bg-primary/10 text-primary'
                                : 'border-transparent text-muted-foreground hover:bg-accent hover:text-foreground',
                            )}
                          >
                            <span className="text-muted-foreground/70">
                              {(() => {
                                const Icon = pillIcon(c.name)
                                return <Icon className="h-4 w-4" />
                              })()}
                            </span>
                            <span className="line-clamp-2 text-[11px] font-semibold leading-tight">
                              {c.name}
                            </span>
                            <span className="text-[10px] font-bold tabular-nums opacity-70">
                              {c.activeProductCount}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <button
          onClick={() => scrollBy(1)}
          disabled={!canRight}
          aria-label="Scroll categories right"
          className="absolute -right-3 top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-border/80 bg-card text-muted-foreground shadow-subtle transition-all duration-150 hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-0 md:flex"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}
