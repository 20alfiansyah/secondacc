import { useEffect, useRef, useState } from 'react'
import type { Product } from '@/api/client'
import { formatRupiah } from '@/utils/format'
import { getProductImage } from '@/utils/productImages'
import { cn } from '@/lib/utils'
import Icon from '@/components/ui/Icon'

interface CustomItemModalProps {
  product: Product | null
  isOpen: boolean
  onClose: () => void
  onConfirm: (product: Product, options: { notes?: string; quantity: number }) => void
}

/** Opsi dinamis sesuai Task 1.3.7 — satu pill aktif per grup (single-select). */
const SUGAR_LEVELS = ['Less', 'Normal', 'No'] as const
const ICE_LEVELS = ['Less', 'Normal', 'No'] as const
const SPICE_LEVELS = ['Not Spicy', 'Medium', 'Spicy'] as const
const QUICK_FOOD_NOTES = ['Sambal on the side', 'No onions'] as const

/** Deteksi golongan produk dari kategori (per PRD: minuman vs makanan). */
function isDrinkCategory(categoryName: string): boolean {
  const lower = categoryName.toLowerCase()
  return (
    lower.includes('coffee') ||
    lower.includes('kopi') ||
    lower.includes('mocktail') ||
    lower.includes('non-coffee') ||
    lower.includes('drink') ||
    lower.includes('tea')
  )
}

export default function CustomItemModal({
  product,
  isOpen,
  onClose,
  onConfirm,
}: CustomItemModalProps) {
  const [sugar, setSugar] = useState<string>('Normal')
  const [ice, setIce] = useState<string>('Normal')
  const [spice, setSpice] = useState<string>('Sedang')
  const [quickNote, setQuickNote] = useState<string>('')
  const [kitchenNote, setKitchenNote] = useState('')
  const [quantity, setQuantity] = useState(1)

  // Fokus modal trap sederhana
  const panelRef = useRef<HTMLDivElement>(null)

  // Reset form saat modal dibuka dengan produk baru
  useEffect(() => {
    if (isOpen && product) {
      setSugar('Normal')
      setIce('Normal')
      setSpice('Sedang')
      setQuickNote('')
      setKitchenNote('')
      setQuantity(1)
      // Pindah fokus ke dalam modal agar trap berfungsi
      const first = panelRef.current?.querySelector<HTMLElement>('button')
      first?.focus()
    }
  }, [isOpen, product])

  // Keyboard: Enter = tambah, Esc = batal; trap Tab di dalam modal
  useEffect(() => {
    if (!isOpen) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      } else if (e.key === 'Enter' && !isTextareaTarget(e.target)) {
        const el = e.target as HTMLElement | null
        // Enter pada button yang dipilih (mis. pill) jangan dobel-trigger
        if (el?.tagName === 'BUTTON') return
        e.preventDefault()
        handleSave()
      } else if (e.key === 'Tab') {
        trapFocus(e)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, product, quantity, sugar, ice, spice, quickNote, kitchenNote])

  function isTextareaTarget(target: EventTarget | null): boolean {
    const tag = (target as HTMLElement | null)?.tagName
    return tag === 'TEXTAREA'
  }

  function trapFocus(e: KeyboardEvent) {
    const panel = panelRef.current
    if (!panel) return
    const focusables = Array.from(
      panel.querySelectorAll<HTMLElement>('button, textarea'),
    ).filter((el) => !(el as HTMLButtonElement).disabled)
    if (focusables.length === 0) return
    const first = focusables[0]
    const last = focusables[focusables.length - 1]
    const active = document.activeElement as HTMLElement | null
    if (e.shiftKey && (active === first || !panel.contains(active))) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && (active === last || !panel.contains(active))) {
      e.preventDefault()
      first.focus()
    }
  }

  if (!isOpen || !product) return null

  const drink = isDrinkCategory(product.categoryName)
  const lineTotal = product.price * quantity

  function handleSave() {
    if (!product) return
    const parts: string[] = []
    if (drink) {
      parts.push(`Sugar: ${sugar}`)
      parts.push(`Ice: ${ice}`)
    } else {
      parts.push(`Spice: ${spice}`)
      if (quickNote) parts.push(quickNote)
    }
    if (kitchenNote.trim()) parts.push(kitchenNote.trim())
    onConfirm(product, { notes: parts.join(', ') || undefined, quantity })
    onClose()
  }

  const imageUrl = getProductImage(product.name, product.categoryName)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        ref={panelRef}
        className="flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-modal animate-in zoom-in-95 duration-150"
      >
        {/* Header: thumb 64px + nama + harga + close */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-4 sm:p-5">
          <div className="flex min-w-0 items-center gap-3.5">
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-slate-200/80 bg-slate-100 shadow-xs">
              <img src={imageUrl} alt={product.name} className="h-full w-full object-cover" loading="lazy" />
            </div>
            <div className="min-w-0">
              <h3 className="truncate font-display text-base font-bold leading-tight text-slate-900">
                {product.name}
              </h3>
              <p className="mt-0.5 truncate text-xs text-slate-500">{product.categoryName}</p>
              <div className="mt-1 font-display text-sm font-extrabold tabular-nums text-primary-dark">
                {formatRupiah(product.price)}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            title="Close"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-800"
          >
            <Icon name="close" className="text-lg" />
          </button>
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4 sm:p-5">
          {/* Ringkasan opsi dinamis — minuman vs makanan */}
          {drink ? (
            <>
              <ChipGroup
                label="Sugar Level"
                options={SUGAR_LEVELS}
                value={sugar}
                onSelect={setSugar}
              />
              <ChipGroup label="Ice Level" options={ICE_LEVELS} value={ice} onSelect={setIce} />
            </>
          ) : (
            <>
              <ChipGroup
                label="Spice Level"
                options={SPICE_LEVELS}
                value={spice}
                onSelect={setSpice}
              />
              <ChipGroup
                label="Quick Notes"
                options={QUICK_FOOD_NOTES}
                value={quickNote}
                onSelect={setQuickNote}
                allowClear
              />
            </>
          )}

          {/* Kitchen note (free text, max 120 chars + counter) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-1.5 font-display text-xs font-bold uppercase tracking-wider text-slate-700">
                <Icon name="edit_note" className="text-[17px] text-primary" />
                Special Instructions
              </label>
              <span className="text-[11px] font-medium tabular-nums text-slate-400">
                {kitchenNote.length}/120
              </span>
            </div>
            <textarea
              value={kitchenNote}
              onChange={(e) => setKitchenNote(e.target.value.slice(0, 120))}
              placeholder="e.g. No onions, dressing on the side, not too spicy..."
              rows={4}
              maxLength={120}
              className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-xs leading-relaxed text-slate-800 shadow-xs transition placeholder:text-slate-400 hover:bg-white focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 sm:text-sm"
            />
          </div>
        </div>

        {/* Footer CTA — stepper qty + total real-time */}
        <div className="flex items-center justify-between gap-4 border-t border-slate-100 bg-slate-50/80 p-4 sm:p-5">
          <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white p-1 shadow-xs">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              aria-label="Decrease quantity"
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 font-bold text-slate-700 tabular-nums transition active:scale-95 hover:bg-slate-200"
            >
              <Icon name="remove" className="text-base" />
            </button>
            <span className="w-7 text-center text-sm font-bold tabular-nums text-slate-900">
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => setQuantity((q) => q + 1)}
              aria-label="Increase quantity"
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 font-bold text-slate-700 tabular-nums transition active:scale-95 hover:bg-slate-200"
            >
              <Icon name="add" className="text-base" />
            </button>
          </div>
          <button
            type="button"
            onClick={handleSave}
            autoFocus
            className="flex h-11 items-center gap-2 whitespace-nowrap rounded-xl border border-primary-dark bg-primary px-5 font-display text-xs font-bold text-white shadow-btn-bismark transition hover:bg-primary-hover active:scale-95"
          >
            <Icon name="shopping_bag" className="text-lg" />
            Add to Order • {formatRupiah(lineTotal)}
          </button>
        </div>
      </div>
    </div>
  )
}

function ChipGroup({
  label,
  options,
  value,
  onSelect,
  allowClear = false,
}: {
  label: string
  options: readonly string[]
  value: string
  onSelect: (v: string) => void
  allowClear?: boolean
}) {
  return (
    <div>
      <label className="mb-2 block font-display text-[10px] font-bold uppercase tracking-wider text-slate-400">
        {label}
      </label>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const active = value === opt
          return (
            <button
              key={opt}
              type="button"
              onClick={() => (active && allowClear ? onSelect('') : onSelect(opt))}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium shadow-xs transition-all duration-150 active:scale-95',
                active
                  ? 'border-live-border bg-live-light font-semibold text-primary-dark'
                  : 'border-transparent bg-slate-100 text-slate-700 hover:border-live-border hover:bg-live-light hover:text-primary-dark',
              )}
            >
              {active && <Icon name="check" className="text-sm text-primary" />}
              {opt}
            </button>
          )
        })}
      </div>
    </div>
  )
}
