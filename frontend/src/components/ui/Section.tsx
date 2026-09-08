import * as React from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Section — container card untuk membagi konten utama jadi blok yang jelas
 * terpisah. Header berisi ikon aksen, judul uppercase tracking-wide, subtitle,
 * badge count opsional, dan area action kanan opsional; lalu garis pemisah
 * halus sebelum konten. `bodyClassName` mengatur scroll internal bila konten
 * bersifat scrollable (mis. MENU CATALOG).
 */
const Section = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    icon?: LucideIcon
    title: string
    subtitle?: string
    badge?: React.ReactNode
    right?: React.ReactNode
    bodyClassName?: string
    children: React.ReactNode
  }
>(({ icon: Icon, title, subtitle, badge, right, bodyClassName, className, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex min-h-0 flex-col rounded-2xl border border-border/70 bg-card shadow-card', className)}
    {...props}
  >
    {/* Header section */}
    <div className="flex shrink-0 items-center gap-3 px-4 pt-4 sm:px-5">
      <div className="flex items-center gap-2.5">
        {Icon && (
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Icon className="h-[18px] w-[18px]" />
          </span>
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">{title}</h2>
            {badge}
          </div>
          {subtitle && (
            <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
      </div>

      {right && <div className="ml-auto">{right}</div>}
    </div>

    {/* Garis pemisah halus */}
    <div className="mt-3.5 shrink-0 border-t border-border/60" />

    {/* Konten — flex-col agar `bodyClassName` berbasis flex-1/min-h-0
        (mis. grid yang bisa di-scroll) ikut ter-constrain oleh tinggi
        parent dan bisa scroll, alih-alih meluber terpotong oleh
        overflow-hidden ancestor. */}
    <div className={cn('flex min-h-0 flex-1 flex-col p-4 sm:p-5', bodyClassName)}>{children}</div>
  </div>
))
Section.displayName = 'Section'

export { Section }
