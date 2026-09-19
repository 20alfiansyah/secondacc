import type { Product } from '@/api/client'
import { cn } from '@/lib/utils'
import { formatRupiah } from '@/utils/format'
import { resolveProductImage } from '@/utils/productImage'
import Icon from '@/components/ui/Icon'

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=500&auto=format&fit=crop&q=80'

/** Lucide glyph per nama kategori (fallback: restaurant). */
function categoryGlyph(name: string): string {
  const lower = name.toLowerCase()
  if (lower.includes('coffee') || lower.includes('espresso') || lower.includes('kopi')) return 'coffee'
  if (lower.includes('tea') || lower.includes('beverage') || lower.includes('non-coffee') || lower.includes('drink'))
    return 'emoji_food_beverage'
  if (lower.includes('pastry') || lower.includes('bakery') || lower.includes('roti') || lower.includes('bread'))
    return 'bakery_dining'
  if (lower.includes('main') || lower.includes('dessert') || lower.includes('cake') || lower.includes('makanan'))
    return 'cake'
  if (lower.includes('snack') || lower.includes('cemilan')) return 'cookie'
  return 'restaurant'
}


/** Grup section untuk tab "All": tiap kategori (urutan kategori) tanpa grup featured. */
function groupByCategory(products: Product[]): { title: string; items: Product[] }[] {
  const byCategory = new Map<string, Product[]>()
  for (const p of products) {
    const list = byCategory.get(p.categoryName) ?? []
    list.push(p)
    byCategory.set(p.categoryName, list)
  }
  return Array.from(byCategory, ([title, items]) => ({ title, items }))
}

/**
 * Zone 2 — Menu Catalog Grid (Stitch screen1 markup 1:1): kartu 4:3 dengan
 * badge Popular (gelap) / Best Seller (gradien SilverTree→Bismark), body
 * nama + deskripsi line-clamp-1, footer harga + tombol tambah hover teal,
 * dan header grup kategori dgn "N Items".
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
  const grouped = activeCategory === 'all' ? groupByCategory(products) : null

  function renderCard(p: Product) {
    const soldOut = !p.isAvailable
    return (
      <div
        key={p.id}
        onClick={() => !soldOut && onSelect(p)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && !soldOut) {
            e.preventDefault()
            onSelect(p)
          }
        }}
        className={cn(
          'group flex flex-col justify-between overflow-hidden rounded-xl bg-white text-left shadow-xs transition-all duration-200 select-none',
          soldOut
            ? 'cursor-not-allowed border border-border/40'
            : 'cursor-pointer border border-slate-200/80 hover:border-[#447C84] hover:shadow-card-hover',
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
                <span className="inline-flex items-center gap-1 rounded-full border border-[#447C84] bg-[#2d5258] px-2.5 py-0.5 font-display text-[10px] font-bold tracking-wide text-white shadow-md">
                  <Icon name="star" className="text-[13px] text-[#65AF92]" />
                  <span className="font-bold tracking-wide text-white">Popular</span>
                </span>
              )}
              {p.isBestSeller && (
                <span
                  className="inline-flex items-center gap-1 rounded-full border border-teal-200/40 px-2.5 py-0.5 font-display text-[10px] font-semibold tracking-wide text-white shadow-md"
                  style={{ background: 'linear-gradient(135deg, rgb(101, 175, 146) 0%, rgb(68, 124, 132) 100%)' }}
                >
                  <Icon name="local_fire_department" className="text-[13px] text-teal-100" />
                  <span className="font-bold tracking-wide">Best Seller</span>
                </span>
              )}
            </div>
          )}

          {/* Overlay grayscale Sold Out */}
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
                'text-xs font-semibold leading-snug tracking-tight transition-colors',
                soldOut ? 'text-muted-foreground' : 'text-slate-900 group-hover:text-[#447C84]',
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
                soldOut ? 'text-muted-foreground/80' : p.isBestSeller ? 'text-[#2d5258]' : 'text-slate-900',
              )}
            >
              {formatRupiah(p.price)}
            </span>
            {soldOut ? (
              <span className="text-[10px] font-semibold italic text-muted-foreground">Sold out</span>
            ) : (
              <span
                className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-700 shadow-xs transition-all group-hover:bg-[#447C84] group-hover:text-white active:scale-95"
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
      <div className="space-y-6">
        {grouped.map((section) => (
          <section key={section.title} className="space-y-3">
            {/* Section header + divider halus */}
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-1">
              <div className="flex items-center gap-2">
                <Icon name={categoryGlyph(section.title)} className="text-[18px] text-[#447C84]" />
                <h3 className="font-display text-xs font-bold uppercase tracking-wider text-slate-900">
                  {section.title}
                </h3>
                <span className="rounded-full border border-slate-200/80 bg-slate-100 px-2 py-0.5 text-[10px] font-semibold tabular-nums text-slate-600">
                  {section.items.length} {section.items.length === 1 ? 'Item' : 'Items'}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3.5 md:grid-cols-3 xl:grid-cols-4">
              {section.items.map(renderCard)}
            </div>
          </section>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-3.5 md:grid-cols-3 xl:grid-cols-4">
      {products.map(renderCard)}
    </div>
  )
}
