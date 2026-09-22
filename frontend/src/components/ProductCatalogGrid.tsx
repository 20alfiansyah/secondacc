import type { Product } from '@/api/client'
<<<<<<< HEAD
=======
import { cn } from '@/lib/utils'
import { formatRupiah } from '@/utils/format'
import { resolveProductImage } from '@/utils/productImage'
>>>>>>> main
import Icon from '@/components/ui/Icon'
import ProductCard from '@/components/ProductCard'

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

<<<<<<< HEAD
/**
 * Zone 2 — Menu Catalog Grid: kartu via komponen bersama ProductCard
 * (markup Stitch screen1) + header grup kategori dgn "N Items".
=======

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
>>>>>>> main
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
              {section.items.map((p) => (
                <ProductCard key={p.id} product={p} onSelect={onSelect} />
              ))}
            </div>
          </section>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-3.5 md:grid-cols-3 xl:grid-cols-4">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} onSelect={onSelect} />
      ))}
    </div>
  )
}
