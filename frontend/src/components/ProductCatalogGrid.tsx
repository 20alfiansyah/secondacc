import { Flame, Sparkles, Star } from 'lucide-react'
import type { Product } from '@/api/client'
import { cn } from '@/lib/utils'
import { formatRupiah } from '@/utils/format'
import { getProductImage } from '@/utils/productImages'

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=500&auto=format&fit=crop&q=80'

/**
 * Resolve gambar produk: pakai imageUrl dari backend bila benar-benar gambar
 * eksternal; kalau placeholder (mis. SVG kosong dari seed) atau blank, pakai
 * mapping getProductImage agar tampil foto real (hindari image broken/blank).
 */
function resolveProductImage(p: Product): string {
  const url = p.imageUrl
  if (url && /^https?:\/\//.test(url)) return url
  return getProductImage(p.name, p.categoryName)
}

/** Grup section untuk tab "All": Recommended & Best Seller, lalu tiap kategori. */
function groupBySections(products: Product[]): { title: string; items: Product[] }[] {
  const featured = products.filter((p) => p.isRecommended || p.isBestSeller)
  const shownIds = new Set(featured.map((p) => p.id))

  const byCategory = new Map<string, Product[]>()
  for (const p of products) {
    if (shownIds.has(p.id)) continue // hindari duplikat kartu
    const key = p.categoryName || 'Lainnya'
    const list = byCategory.get(key)
    if (list) list.push(p)
    else byCategory.set(key, [p])
  }

  const sections: { title: string; items: Product[] }[] = []
  if (featured.length > 0) sections.push({ title: 'Recommended & Best Seller', items: featured })
  for (const [name, items] of byCategory) sections.push({ title: name, items })
  return sections
}

function SectionIcon({ label }: { label: string }) {
  const lower = label.toLowerCase()
  if (lower.includes('recommended') && !lower.includes('coffee')) {
    return <Star className="h-4 w-4" />
  }
  if (lower.includes('best seller') || lower.includes('best-seller')) {
    return <Flame className="h-4 w-4" />
  }
  if (lower.includes('coffee') || lower.includes('kopi')) return <Sparkles className="h-4 w-4" />
  return <Sparkles className="h-4 w-4" />
}

/**
 * Zone 2 — Bottom: Menu Catalog Grid with Category Section Headers (Task 1.3.6).
 * Tab "All" mengelompokkan produk di bawah header section + divider halus;
 * tab kategori spesifik menampilkan grid terfokus. Kartu pakai foto 1:1,
 * badge Recommended/Best Seller, badge + overlay grayscale Sold Out, dan klik
 * kartu me-wire onSelect ke parent (modal kustomisasi di Task 1.3.7).
 */
export default function ProductCatalogGrid({
  products,
  activeCategory,
  onSelect,
}: {
  products: Product[]
  activeCategory: 'all' | 'recommended' | 'best-seller' | number
  onSelect: (product: Product) => void
}) {
  const grouped = activeCategory === 'all' ? groupBySections(products) : null

  function renderCard(p: Product) {
    const soldOut = !p.isAvailable
    return (
      <div
        key={p.id}
        onClick={() => onSelect(p)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onSelect(p)
          }
        }}
        className={cn(
          'group relative flex flex-col justify-between overflow-hidden rounded-2xl border bg-card text-left shadow-card transition-all duration-200 select-none p-2.5 sm:p-3',
          soldOut
            ? 'cursor-not-allowed border-border/40'
            : 'cursor-pointer border-border/70 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-card-hover active:scale-[0.98]',
        )}
      >
        {/* Foto hero — rasio 4:3 proporsional, hemat tinggi & tidak memotong sajian makanan */}
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-muted/40">
          <img
            src={resolveProductImage(p)}
            alt={p.name}
            loading="lazy"
            className={cn(
              'h-full w-full object-cover object-center transition-transform duration-300',
              soldOut && 'grayscale',
              !soldOut && 'group-hover:scale-105',
            )}
            onError={(e) => {
              ;(e.target as HTMLImageElement).src = FALLBACK_IMAGE
            }}
          />

          {/* Badge Recommended / Best Seller */}
          {(p.isRecommended || p.isBestSeller) && (
            <div className="absolute left-1.5 top-1.5 flex flex-col gap-1">
              {p.isRecommended && (
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/50 bg-amber-50/95 px-2 py-0.5 text-[9px] sm:text-[10px] font-semibold text-amber-700 shadow-xs backdrop-blur-sm">
                  <Star className="h-2.5 w-2.5" />
                  Recommended
                </span>
              )}
              {p.isBestSeller && (
                <span className="inline-flex items-center gap-1 rounded-full border border-rose-400/50 bg-rose-50/95 px-2 py-0.5 text-[9px] sm:text-[10px] font-semibold text-rose-600 shadow-xs backdrop-blur-sm">
                  <Flame className="h-2.5 w-2.5" />
                  Best Seller
                </span>
              )}
            </div>
          )}

          {/* Badge + overlay grayscale Sold Out */}
          {soldOut && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-[1px]">
              <span className="rounded-full bg-destructive/90 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-destructive-foreground shadow-xs">
                Sold Out
              </span>
            </div>
          )}
        </div>

        {/* Body */}
        <div className="mt-2.5 flex flex-1 flex-col justify-between">
          <div>
            <h3
              className={cn(
                'line-clamp-1 text-xs font-bold tracking-tight transition-colors sm:text-sm',
                soldOut ? 'text-muted-foreground' : 'text-foreground group-hover:text-primary',
              )}
            >
              {p.name}
            </h3>
            {p.description && (
              <p
                className={cn(
                  'mt-0.5 line-clamp-1 text-[11px] leading-normal',
                  soldOut ? 'text-muted-foreground/70' : 'text-muted-foreground',
                )}
              >
                {p.description}
              </p>
            )}
          </div>

          <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-border/50 pt-2">
            <span
              className={cn(
                'text-xs font-extrabold tracking-tight tabular-nums sm:text-sm',
                soldOut ? 'text-muted-foreground/80' : 'text-foreground',
              )}
            >
              {formatRupiah(p.price)}
            </span>
            {soldOut ? (
              <span className="text-[10px] font-semibold italic text-muted-foreground">Habis</span>
            ) : (
              <span className="flex h-7 items-center rounded-lg bg-primary px-2.5 text-[11px] font-bold text-primary-foreground shadow-xs transition-transform active:scale-95">
                Add +
              </span>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (grouped) {
    return (
      <div className="space-y-6 pb-20 lg:pb-4">
        {grouped.map((section) => (
          <div key={section.title}>
            {/* Section header + divider halus */}
            <div className="mb-3.5 flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <SectionIcon label={section.title} />
              </span>
              <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">
                {section.title}
              </h2>
              <span className="rounded-full bg-muted px-2 py-0.2 text-[10px] font-bold text-muted-foreground tabular-nums">
                {section.items.length}
              </span>
              <div className="h-px flex-1 bg-border/60" />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
              {section.items.map(renderCard)}
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-3 pb-20 sm:grid-cols-2 lg:grid-cols-3 lg:pb-4 xl:grid-cols-4 2xl:grid-cols-5">
      {products.map(renderCard)}
    </div>
  )
}
