import { cn } from '@/lib/utils'

/**
 * Icon — wrapper Material Symbols Outlined (Stitch design icon set).
 * Pemakaian: <Icon name="point_of_sale" className="text-[19px]" />
 * `filled` mengaktifkan varian FILL 1 (ikon solid).
 */
export default function Icon({
  name,
  className,
  filled = false,
}: {
  name: string
  className?: string
  filled?: boolean
}) {
  return (
    <span
      aria-hidden="true"
      className={cn('material-symbols-outlined shrink-0', filled && 'filled', className)}
    >
      {name}
    </span>
  )
}
