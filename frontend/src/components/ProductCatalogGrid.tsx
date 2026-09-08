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
    return <Star className="h-3.5 w-3.5" />
  }
  if (lower.includes('best seller') || lower.includes('best-seller')) {
    return <Flame className="h-3.5 w-3.5" />
  }
  if (lower.includes('coffee') || lower.includes('kopi')) return <Sparkles className="h-3.5 w-3.5" />
  return <Sparkles className="h-3.5 w-3.5" />
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
          'group relative flex flex-col justify-between overflow-hidden rounded-2xl border bg-card text-left shadow-card transition-all duration-200 select-none',
          soldOut
            ? 'cursor-not-allowed border-border/40'
            : 'cursor-pointer border-border/70 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-card-hover active:scale-[0.98]',
        )}
      >
        {/* Foto rasio 1:1 */}
        <div className="relative aspect-square w-full overflow-hidden bg-muted">
          <img
            src={resolveProductImage(p)}
            alt={p.name}
            loading="lazy"
            className={cn(
              'h-full w-full object-cover transition-transform duration-300',
              soldOut && 'grayscale',
              !soldOut && 'group-hover:scale-105',
            )}
            onError={(e) => {
              ;(e.target as HTMLImageElement).src = FALLBACK_IMAGE
            }}
          />

          {/* Badge Recommended / Best Seller */}
          {(p.isRecommended || p.isBestSeller) && (
            <div className="absolute left-2.5 top-2.5 flex flex-col gap-1">
              {p.isRecommended && (
                <span className="inline-flex items-center gap-1 rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-md">
                  <Star className="h-3 w-3" />
                  Recommended
                </span>
              )}
              {p.isBestSeller && (
                <span className="inline-flex items-center gap-1 rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-md">
                  <Flame className="h-3 w-3" />
                  Best Seller
                </span>
              )}
            </div>
          )}

          {/* Badge + overlay grayscale Sold Out */}
          {soldOut && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted/40">
              <span className="rounded-full bg-destructive/90 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-destructive-foreground shadow-sm">
                Sold Out
              </span>
            </div>
          )}
        </div>

        {/* Body */}
        <div className="flex flex-1 flex-col justify-between p-3.5">
          <h3
            className={cn(
              'line-clamp-1 text-sm font-bold transition-colors',
              soldOut ? 'text-muted-foreground' : 'text-foreground group-hover:text-primary',
            )}
          >
            {p.name}
          </h3>
          {p.description && (
            <p
              className={cn(
                'mt-0.5 line-clamp-2 text-[11px] leading-tight',
                soldOut ? 'text-muted-foreground/70' : 'text-muted-foreground',
              )}
            >
              {p.description}
            </p>
          )}

          <div className="mt-3.5 flex items-center justify-between border-t border-border/50 pt-2.5">
            <span
              className={cn(
                'text-sm sm:text-[15px] font-extrabold tracking-tight tabular-nums',
                soldOut ? 'text-muted-foreground/80' : 'text-foreground',
              )}
            >
              {formatRupiah(p.price)}
            </span>
            {soldOut ? (
              <span className="text-[11px] font-semibold italic text-muted-foreground">Habis</span>
            ) : (
              <span className="flex h-8 items-center rounded-xl bg-primary px-2.5 text-xs font-bold text-primary-foreground shadow-xs">
                Pesan
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
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <SectionIcon label={section.title} />
              </span>
              <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">
                {section.title}
              </h2>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground tabular-nums">
                {section.items.length}
              </span>
              <div className="h-px flex-1 bg-border" />
            </div>
            <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
              {section.items.map(renderCard)}
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-3.5 pb-20 sm:grid-cols-2 md:grid-cols-3 lg:pb-4 xl:grid-cols-4">
      {products.map(renderCard)}
    </div>
  )
}
