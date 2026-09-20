import { cn } from '@/lib/utils'

/**
 * Badge status aktif/nonaktif (markup 1:1 dari StatusBadge AccountPage):
 * hijau live dgn dot utk aktif, netral slate utk nonaktif.
 */
export default function StatusPill({
  active,
  activeLabel = 'Active',
  inactiveLabel = 'Inactive',
}: {
  active: boolean
  activeLabel?: string
  inactiveLabel?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-bold',
        active
          ? 'border-live-border bg-live-light text-primary-dark'
          : 'border-slate-200 bg-slate-100 text-slate-500',
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', active ? 'bg-live' : 'bg-slate-400')} />
      {active ? activeLabel : inactiveLabel}
    </span>
  )
}
