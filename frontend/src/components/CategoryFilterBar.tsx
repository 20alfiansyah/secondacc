import { useEffect, useMemo, useRef } from 'react'
import type { Category, Product } from '@/api/client'
import { cn } from '@/lib/utils'

export type CategoryFilter = 'all' | 'recommended' | 'best-seller' | number
export type SortOption = 'default' | 'price-asc' | 'price-desc' | 'name-asc'

/** Label pendek utk tombol "Sort: …" sesuai Stitch spec. */
export const SORT_SHORT_LABEL: Record<SortOption, string> = {
  default: 'Popular',
  'price-asc': 'Price ↑',
  'price-desc': 'Price ↓',
  'name-asc': 'Name',
}

interface Pill {
  key: string
  label: string
  count: number
  value: CategoryFilter
}

/**
 * Zone 2 — Middle: katalog toolbar (Stitch screen1 markup 1:1): search bar
 * dengan kbd ⌘K (fokus via Ctrl/⌘+K atau "/"), tombol Sort, dan baris pills
 * kategori All + tiap kategori dengan count. Pill "Popular"/"Best Seller"
 * memakai flag produk (isRecommended/isBestSeller) seperti implementasi lama.
 */
export default function CategoryFilterBar({
  categories,
  products,
  activeCategory,
  onSelectCategory,
  search,
  onSearchChange,
  sortOption,
  onSortChange,
}: {
  categories: Category[]
  products: Product[]
  activeCategory: CategoryFilter
  onSelectCategory: (value: CategoryFilter) => void
  search: string
  onSearchChange: (value: string) => void
  sortOption: SortOption
  onSortChange: (value: SortOption) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)

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
        label: 'Popular',
        count: counts.recommended,
        value: 'recommended',
      },
      {
        key: 'best-seller',
        label: 'Best Seller',
        count: counts.bestSeller,
        value: 'best-seller',
      },
    ]
    const dynamic = categories.map((c) => ({
      key: `cat-${c.id}`,
      label: c.name,
      count: c.activeProductCount,
      value: c.id as CategoryFilter,
    }))
    return [...base, ...dynamic]
  }, [categories, counts])

  // Shortcut keyboard: ⌘K / Ctrl+K atau "/" memfokus kolom pencarian.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null
      const typing =
        target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      if ((e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !typing)) {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="space-y-3 flex-shrink-0">
      {/* Search bar + Sort */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-base text-slate-400">
            search
          </span>
          <input
            ref={inputRef}
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            type="text"
            placeholder="Search menu items, SKU, or category... (⌘K)"
            className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-14 text-xs text-slate-800 shadow-xs transition placeholder:text-slate-400 hover:bg-slate-50 focus:border-[#447C84] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#447C84]/30"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
            <kbd className="rounded border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
              ⌘K
            </kbd>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            const order: SortOption[] = ['default', 'price-asc', 'price-desc', 'name-asc']
            onSortChange(order[(order.indexOf(sortOption) + 1) % order.length]!)
          }}
          title="Urutkan produk"
          className="flex flex-shrink-0 cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 shadow-xs transition hover:border-slate-300"
        >
          <span className="material-symbols-outlined text-sm text-[#447C84]">tune</span>
          <span className="text-[11px] font-medium">Sort: {SORT_SHORT_LABEL[sortOption]}</span>
        </button>
      </div>

      {/* Category pills */}
      <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto">
        {pills.map((pill) => {
          const isActive = activeCategory === pill.value
          return (
            <button
              key={pill.key}
              onClick={() => onSelectCategory(pill.value)}
              className={cn(
                'flex flex-shrink-0 cursor-pointer items-center gap-2 rounded-lg px-3 py-1.5 text-xs shadow-xs transition',
                isActive
                  ? 'bg-[#447C84] font-semibold text-white'
                  : 'border border-slate-200 bg-white font-medium text-slate-600 shadow-xs hover:bg-slate-50 hover:text-slate-900',
              )}
            >
              <span>{pill.label}</span>
              <span
                className={cn(
                  'rounded px-1.5 py-0.5 text-[10px] font-bold tabular-nums',
                  isActive ? 'bg-[#2d5258] text-white' : 'bg-slate-100 text-slate-600 font-semibold',
                )}
              >
                {pill.count}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
