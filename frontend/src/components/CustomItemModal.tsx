import { useEffect, useRef, useState } from 'react'
import { Check, Minus, Plus, ShoppingBag, Utensils, X } from 'lucide-react'
import type { Product } from '@/api/client'
import { formatRupiah } from '@/utils/format'
import { getProductImage } from '@/utils/productImages'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

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
        className="flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-border/80 bg-card shadow-modal animate-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/70 px-5 py-3.5">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Utensils className="h-4 w-4" />
            </div>
            <h2 className="text-sm font-bold text-foreground">Customize Order</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
          {/* Ringkasan produk */}
          <div className="flex gap-3.5 rounded-2xl border border-border/70 bg-background/50 p-3">
            <img
              src={imageUrl}
              alt={product.name}
              className="h-16 w-16 shrink-0 rounded-xl object-cover shadow-xs"
              loading="lazy"
            />
            <div className="min-w-0 flex-1">
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                {product.categoryName}
              </span>
              <h3 className="mt-1 truncate text-sm font-bold text-foreground">{product.name}</h3>
              <p className="text-sm font-extrabold text-primary tabular-nums">
                {formatRupiah(product.price)}
              </p>
            </div>
          </div>

          {/* Opsi dinamis — minuman vs makanan */}
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

          {/* Kitchen note (free text) */}
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Kitchen Note
            </label>
            <textarea
              value={kitchenNote}
              onChange={(e) => setKitchenNote(e.target.value)}
              placeholder="Add a note for the kitchen..."
              rows={3}
              className="w-full resize-none rounded-xl border border-input/80 bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* Stepper qty */}
          <div className="flex items-center justify-between rounded-2xl border border-border/80 bg-secondary/30 p-3">
            <span className="text-xs font-bold uppercase tracking-wider text-foreground">
              Quantity
            </span>
            <div className="flex items-center gap-2 rounded-xl border border-border/80 bg-card p-1">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                aria-label="Decrease quantity"
                className="flex h-11 w-11 items-center justify-center rounded-lg hover:bg-muted text-foreground transition-colors active:scale-90"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-8 text-center text-sm font-black tabular-nums text-foreground">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => setQuantity((q) => q + 1)}
                aria-label="Increase quantity"
                className="flex h-11 w-11 items-center justify-center rounded-lg hover:bg-muted text-foreground transition-colors active:scale-90"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Footer CTA — total real-time */}
        <div className="border-t border-border/80 bg-card p-4">
          <Button
            onClick={handleSave}
            className="h-12 w-full text-sm font-bold shadow-sm"
            autoFocus
          >
            <ShoppingBag className="h-4 w-4" />
            Add to Order • {formatRupiah(lineTotal)}
            <kbd className="ml-1 rounded-md bg-primary-foreground/20 px-1.5 py-0.5 text-[10px] font-semibold">
              Enter
            </kbd>
          </Button>
          <p className="mt-2 text-center text-[11px] text-muted-foreground">
            <kbd className="rounded border border-border/70 bg-background px-1 text-[10px]">Enter</kbd>{' '}
            to add •{' '}
            <kbd className="rounded border border-border/70 bg-background px-1 text-[10px]">Esc</kbd>{' '}
            to cancel
          </p>
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
      <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </label>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => {
          const active = value === opt
          return (
            <button
              key={opt}
              type="button"
              onClick={() => (active && allowClear ? onSelect('') : onSelect(opt))}
              className={cn(
                'inline-flex h-11 items-center gap-1.5 rounded-full border px-4 text-sm font-semibold transition-all duration-150 active:scale-95',
                active
                  ? 'border-primary bg-primary text-primary-foreground shadow-xs'
                  : 'border-border/80 bg-background text-foreground hover:bg-accent',
              )}
            >
              {active && <Check className="h-3 w-3" />}
              {opt}
            </button>
          )
        })}
      </div>
    </div>
  )
}
