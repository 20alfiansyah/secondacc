import type { ReactNode } from 'react'

/**
 * Primary CTA gaya POS — markup 1:1 tombol "New Order" di OrderDetailsPanel
 * (teal Bismark #447C84, radius-lg, active:scale-95). Ikon + label dikirim
 * via children, contoh: <Icon name="add" className="text-sm" /> New Order.
 */
export default function PrimaryAction({
  onClick,
  disabled,
  children,
  className,
}: {
  onClick: () => void
  disabled?: boolean
  children: ReactNode
  /** Override tambahan (mis. flex-1 di mobile) — digabung setelah class dasar. */
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-[#447C84] px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-all active:scale-95 hover:bg-[#396a71] disabled:pointer-events-none disabled:opacity-50 ${className ?? ''}`}
    >
      {children}
    </button>
  )
}
