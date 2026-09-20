import { useEffect, useRef } from 'react'
import Icon from '@/components/ui/Icon'

/**
 * Search bar gaya POS (markup 1:1 input di CategoryFilterBar): ikon search
 * kiri, kbd ⌘K kanan, shortcut ⌘K / Ctrl+K atau "/" untuk memfokuskan input.
 */
export default function SearchBar({
  value,
  onChange,
  placeholder = 'Search menu items, SKU, or category... (⌘K)',
  ariaLabel,
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  ariaLabel?: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  // Shortcut keyboard: ⌘K / Ctrl+K atau "/" memfokus kolom pencarian.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null
      const typing =
        target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      if ((e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !typing)) {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="relative flex-1">
      <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-base text-slate-400" />
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        type="text"
        placeholder={placeholder}
        aria-label={ariaLabel}
        className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-14 text-xs text-slate-800 shadow-xs transition placeholder:text-slate-400 hover:bg-slate-50 focus:border-[#447C84] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#447C84]/30"
      />
      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
        <kbd className="rounded border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
          ⌘K
        </kbd>
      </div>
    </div>
  )
}
