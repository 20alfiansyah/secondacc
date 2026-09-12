import Icon from '@/components/ui/Icon'

/**
 * TopBar — breadcrumb bar di atas konten utama (Stitch design: RestroBit POS).
 * Kiri: ikon storefront + breadcrumb halaman aktif.
 * Status pill (printer/sync) sengaja belum ada: fitur backend-nya belum ada,
 * jangan tampilkan status palsu.
 */
export default function TopBar({ page }: { page: string }) {
  return (
    <div className="flex h-12 shrink-0 items-center gap-2 border-b border-border/60 bg-card px-4 sm:px-5">
      <Icon name="storefront" className="text-[18px] text-primary" />
      <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-xs">
        <span className="font-display font-semibold uppercase tracking-wider text-foreground">
          POS
        </span>
        <Icon name="chevron_right" className="text-[14px] text-slate-300" />
        <span className="truncate font-medium text-muted-foreground">{page}</span>
      </nav>
    </div>
  )
}
