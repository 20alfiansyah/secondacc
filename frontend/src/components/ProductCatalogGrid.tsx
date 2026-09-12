import type { Product } from '@/api/client'
import { cn } from '@/lib/utils'
import { formatRupiah } from '@/utils/format'
import { getProductImage } from '@/utils/productImages'
import Icon from '@/components/ui/Icon'

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

/** Material Symbols glyph per judul section grup katalog. */
function sectionGlyph(label: string): string {
  const lower = label.toLowerCase()
  if (lower.includes('best seller') || lower.includes('best-seller')) return 'local_fire_department'
  if (lower.includes('recommended')) return 'star'
  if (lower.includes('coffee') || lower.includes('kopi')) return 'coffee'
  if (lower.includes('makan') || lower.includes('food')) return 'restaurant'
  if (lower.includes('snack') || lower.includes('cemilan') || lower.includes('roti')) return 'cookie'
  return 'auto_awesome'
}

/** Grup section untuk tab "All": Recommended & Best Seller, lalu tiap kategori. */
function groupBySections(products: Product[]): { title: string; items: Product[] }[] {
  const featured = products.filter((p) => p.isRecommended || p.isBestSeller)
  const shownIds = new Set(featured.map((p) => p.id))

  const byCategory = new Map<string, Product[]>()
  for (const p of products) {
    if (shownIds.has(p.id)) continue
    const list = byCategory.get(p.categoryName) ?? []
    list.push(p)
    byCategory.set(p.categoryName, list)
  }

  const sections: { title: string; items: Product[] }[] = []
  if (featured.length > 0) sections.push({ title: 'Recommended & Best Seller', items: featured })
  for (const [name, items] of byCategory) sections.push({ title: name, items })
  return sections
}

/**
 * Zone 2 — Bottom: Menu Catalog Grid with Category Section Headers (Stitch
 * design). Kartu 4:3 dengan badge Popular (gelap) / Best Seller (gradien),
 * tombol tambah + hover-fill teal, dan header grup kategori dgn "N Items".
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
          'group relative flex flex-col justify-between overflow-hidden rounded-xl border bg-white text-left shadow-xs transition-all duration-200 select-none',
          soldOut
            ? 'cursor-not-allowed border-border/40'
            : 'cursor-pointer border-slate-200/80 hover:border-primary hover:shadow-card-hover active:scale-[0.98]',
        )}
      >
        {/* Foto hero — rasio 4:3 sesuai desain */}
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100">
          <img
            src={resolveProductImage(p)}
            alt={p.name}
            loading="lazy"
            className={cn(
              'h-full w-full object-cover object-center transition-transform duration-300 ease-out',
              soldOut && 'grayscale',
              !soldOut && 'group-hover:scale-105',
            )}
            onError={(e) => {
              ;(e.target as HTMLImageElement).src = FALLBACK_IMAGE
            }}
          />

          {/* Badge Popular (gelap) / Best Seller (gradien SilverTree→Bismark) */}
          {(p.isRecommended || p.isBestSeller) && (
            <div className="absolute left-2 top-2 flex flex-col gap-1">
              {p.isRecommended && (
                <span className="inline-flex items-center gap-1 rounded-full border border-primary bg-primary-dark px-2.5 py-0.5 font-display text-[10px] font-bold tracking-wide text-white shadow-md">
                  <Icon name="star" className="text-[13px] text-live" />
                  Popular
                </span>
              )}
              {p.isBestSeller && (
                <span
                  className="inline-flex items-center gap-1 rounded-full border border-teal-200/40 px-2.5 py-0.5 font-display text-[10px] font-bold tracking-wide text-white shadow-md"
                  style={{ background: 'linear-gradient(135deg, #65AF92 0%, #447C84 100%)' }}
                >
                  <Icon name="local_fire_department" className="text-[13px] text-teal-100" />
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
        <div className="flex flex-1 flex-col justify-between p-3">
          <div>
            <h4
              className={cn(
                'line-clamp-2 text-xs font-semibold leading-snug tracking-tight transition-colors',
                soldOut ? 'text-muted-foreground' : 'text-slate-900 group-hover:text-primary',
              )}
            >
              {p.name}
            </h4>
            {p.description && (
              <p
                className={cn(
                  'mt-0.5 line-clamp-1 text-[11px] leading-normal',
                  soldOut ? 'text-muted-foreground/70' : 'text-slate-500',
                )}
              >
                {p.description}
              </p>
            )}
          </div>

          <div className="mt-2.5 flex items-center justify-between border-t border-slate-100 pt-2">
            <span
              className={cn(
                'text-xs font-bold tabular-nums tracking-tight',
                soldOut ? 'text-muted-foreground/80' : 'text-slate-900',
              )}
            >
              {formatRupiah(p.price)}
            </span>
            {soldOut ? (
              <span className="text-[10px] font-semibold italic text-muted-foreground">Sold out</span>
            ) : (
              <span
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-lg shadow-xs transition-all active:scale-95',
                  p.isBestSeller || p.isRecommended
                    ? 'bg-primary text-white hover:bg-primary-hover'
                    : 'bg-slate-100 text-slate-700 group-hover:bg-primary group-hover:text-white',
                )}
                aria-hidden="true"
              >
                <Icon name="add" className="text-[16px]" />
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
            <div className="mb-3 flex items-center gap-2 border-b border-slate-100 pb-1.5">
              <Icon name={sectionGlyph(section.title)} className="text-[18px] text-primary" />
              <h3 className="font-display text-xs font-bold uppercase tracking-wider text-slate-900">
                {section.title}
              </h3>
              <span className="rounded-full border border-slate-200/80 bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 tabular-nums">
                {section.items.length} Items
              </span>
            </div>
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {section.items.map(renderCard)}
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-3.5 pb-20 sm:grid-cols-2 lg:grid-cols-3 lg:pb-4 xl:grid-cols-4">
      {products.map(renderCard)}
    </div>
  )
}
