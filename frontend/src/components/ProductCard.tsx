import type { ReactNode } from 'react'
import type { Product } from '@/api/client'
import { formatRupiah } from '@/utils/format'
import Icon from '@/components/ui/Icon'
import { cn } from '@/lib/utils'

/**
 * ProductCard shared (Task Fase 2.5): kartu produk POS-style — thumbnail
 * persegi (grayscale saat sold out), badge Popular / Best Seller / Sold Out,
 * harga + label ketersediaan, dan slot `actions` bebas untuk CTA halaman
 * (mis. manajemen menu: toggle status, edit, delete). Halaman POS tetap
 * memakai ProductCatalogGrid — kartu ini untuk halaman manajemen.
 */
export default function ProductCard({
  product,
  subtitle,
  actions,
}: {
  product: Product
  /** Teks di bawah nama produk (mis. categoryName). */
  subtitle?: string
  /** Slot aksi (render di footer kartu; tanpa slot = kartu tanpa footer). */
  actions?: ReactNode
}) {
  const soldOut = !product.isAvailable

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-border/70 bg-card shadow-card transition-all hover:shadow-card-hover">
      {/* Thumbnail — imageUrl /uploads/... dipakai langsung (proxy Vite ke backend). */}
      <div className="relative aspect-square overflow-hidden bg-slate-100">
        <div className="absolute inset-0 flex items-center justify-center text-slate-300">
          <Icon name="restaurant_menu" className="text-[40px]" />
        </div>
        {product.imageUrl && (
          <img
            src={product.imageUrl}
            alt={product.name}
            loading="lazy"
            onError={(e) => {
              ;(e.target as HTMLImageElement).style.display = 'none'
            }}
            className={cn('absolute inset-0 h-full w-full object-cover', soldOut && 'grayscale')}
          />
        )}
        <div className="absolute left-2 top-2 flex flex-wrap gap-1">
          {product.isRecommended && (
            <span className="flex items-center gap-0.5 rounded-full bg-primary-light px-2 py-0.5 text-[10px] font-bold text-primary-dark">
              <Icon name="star" className="text-[11px]" />
              Popular
            </span>
          )}
          {product.isBestSeller && (
            <span className="flex items-center gap-0.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-2 py-0.5 text-[10px] font-bold text-white">
              <Icon name="local_fire_department" className="text-[11px]" />
              Best Seller
            </span>
          )}
        </div>
        {soldOut && (
          <span className="absolute right-2 top-2 rounded-full bg-slate-900/80 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
            Sold Out
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3.5">
        <div className="min-w-0">
          <h3 className="truncate font-display text-sm font-bold text-slate-900">{product.name}</h3>
          {subtitle && <p className="truncate text-[11px] text-muted-foreground">{subtitle}</p>}
        </div>
        <div className="flex items-center justify-between">
          <span className="font-display text-sm font-bold tabular-nums text-primary">
            {formatRupiah(product.price)}
          </span>
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-[10px] font-bold',
              product.isAvailable
                ? 'bg-accent text-[#2d5258]'
                : 'bg-destructive/10 text-destructive',
            )}
          >
            {product.isAvailable ? 'Available' : 'Sold Out'}
          </span>
        </div>

        {actions && (
          <div className="mt-auto flex items-center gap-1.5 border-t border-slate-100 pt-2.5">
            {actions}
          </div>
        )}
      </div>
    </div>
  )
}
