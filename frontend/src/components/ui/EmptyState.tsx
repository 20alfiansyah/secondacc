import { cn } from '@/lib/utils'
import Icon from '@/components/ui/Icon'

/**
 * Empty state seragam untuk semua kondisi "belum ada item / data" (Stitch
 * style): kartu border dashed 2px + ikon bulat + judul + deskripsi.
 * Loading state memakai pola yang sama dengan ikon animate-pulse.
 */
export default function EmptyState({
  icon,
  title,
  description,
  loading = false,
  compact = false,
  className,
}: {
  icon: string
  title: string
  description?: string
  loading?: boolean
  /** compact: tanpa padding besar — untuk slot sempit (baris tiket, list item). */
  compact?: boolean
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center space-y-2 rounded-2xl border-2 border-dashed border-slate-200/80 bg-slate-50/70 text-center',
        compact ? 'p-4' : 'p-6',
        className,
      )}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white shadow-xs">
        <Icon name={icon} className={cn('text-[20px] text-[#447C84]', loading && 'animate-pulse')} />
      </div>
      <div className="space-y-0.5">
        <p className="font-display text-xs font-bold text-slate-800">{title}</p>
        {description && (
          <p className={cn('text-[11px] text-slate-500', !compact && 'max-w-[220px]')}>{description}</p>
        )}
      </div>
    </div>
  )
}
