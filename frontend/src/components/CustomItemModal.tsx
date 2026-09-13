import { useEffect, useRef, useState } from 'react'
import type { Product } from '@/api/client'
import { formatRupiah } from '@/utils/format'
import Icon from '@/components/ui/Icon'

const NOTE_MAX = 120

/** QUICK TAGS spesifikasi Stitch (customize_modal): klik menambah tag ke notes. */
const QUICK_TAGS = [
  'No Onions',
  'Sauce on Side',
  'Mild / Not Spicy',
  'Less Ice',
  'Sugar on Side',
  'Pack Securely',
  'Pack Separately',
] as const

/**
 * Zone 4 — Customize Item Modal (Stitch screen4 markup 1:1): overlay gelap
 * blur, panel max-w-xl dengan header produk (thumb + nama + deskripsi +
 * harga), SPECIAL INSTRUCTIONS (textarea 120 char), QUICK TAGS chips, dan
 * footer stepper + CTA "Add to Order • Rp X".
 *
 * Mode edit (`editing` diisi): prefill notes & qty dari line keranjang,
 * CTA berubah jadi "Save Changes • Rp X".
 */
export default function CustomItemModal({
  product,
  onClose,
  onConfirm,
  editing,
}: {
  product: Product
  onClose: () => void
  onConfirm: (notes: string, quantity: number) => void
  /** Prefill untuk mode edit line yang sudah ada. */
  editing?: { notes: string; quantity: number }
}) {
  const [kitchenNote, setKitchenNote] = useState(editing?.notes ?? '')
  const [quantity, setQuantity] = useState(editing?.quantity ?? 1)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  // Keyboard: Esc menutup, Enter (di luar textarea) submit.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // Focus trap sederhana: kembalikan fokus ke panel saat fokus hilang ke body.
  useEffect(() => {
    panelRef.current?.focus()
  }, [])

  function appendTag(tag: string) {
    setKitchenNote((prev) => {
      const parts = prev
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
      if (parts.some((p) => p.toLowerCase() === tag.toLowerCase())) return prev
      const next = [...parts, tag].join(', ')
      return next.length > NOTE_MAX ? prev : next
    })
  }

  function handleAdd() {
    onConfirm(kitchenNote.trim(), quantity)
  }

  const lineTotal = product.price * quantity

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-[2px]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white shadow-2xl outline-none"
      >
        {/* Header produk */}
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 p-4">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl bg-slate-100">
              {product.imageUrl && /^https?:\/\//.test(product.imageUrl) ? (
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    ;(e.target as HTMLImageElement).style.display = 'none'
                  }}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-slate-400">
                  <Icon name="coffee" className="text-[26px]" />
                </div>
              )}
            </div>
            <div className="min-w-0">
              <h3 className="truncate font-display text-base font-bold tracking-tight text-slate-900">
                {product.name}
              </h3>
              <p className="truncate text-[11px] text-slate-500">
                {product.description || product.categoryName}
              </p>
              <p className="mt-0.5 text-sm font-bold text-[#447C84]">{formatRupiah(product.price)}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 flex-shrink-0 cursor-pointer items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close"
          >
            <Icon name="close" className="text-[20px]" />
          </button>
        </div>

        {/* Body: SPECIAL INSTRUCTIONS + QUICK TAGS */}
        <div className="space-y-4 p-4">
          <div className="space-y-1.5">
            <label
              htmlFor="custom-note"
              className="flex items-center justify-between font-display text-[10px] font-bold uppercase tracking-wider text-slate-400"
            >
              <span className="flex items-center gap-1">
                <Icon name="edit_note" className="text-[13px] text-slate-400" />
                SPECIAL INSTRUCTIONS
              </span>
              <span className="font-medium normal-case tracking-normal text-slate-400">
                Max. {NOTE_MAX} characters
              </span>
            </label>
            <textarea
              id="custom-note"
              ref={textareaRef}
              rows={4}
              value={kitchenNote}
              maxLength={NOTE_MAX}
              onChange={(e) => setKitchenNote(e.target.value)}
              placeholder="e.g. extra hot, light sugar, pack separately…"
              className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-3 text-xs leading-relaxed text-slate-800 placeholder:text-slate-400 focus:border-[#447C84] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#447C84]/30"
            />
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-1 font-display text-[10px] font-bold uppercase tracking-wider text-slate-400">
              <Icon name="bolt" className="text-[13px] text-[#65AF92]" />
              QUICK TAGS:
            </label>
            <div className="flex flex-wrap gap-2">
              {QUICK_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => appendTag(tag)}
                  className="cursor-pointer rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-600 shadow-xs transition hover:border-[#447C84] hover:bg-[#edf7f3] hover:text-[#2d5258] active:scale-95"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer: stepper + CTA */}
        <div className="flex items-center justify-between gap-4 border-t border-slate-100 bg-slate-50/50 p-4">
          <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-1 shadow-xs">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              disabled={quantity <= 1}
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30"
            >
              −
            </button>
            <span className="min-w-[2.5rem] text-center font-display text-base font-bold tabular-nums text-slate-900">
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.min(99, q + 1))}
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100"
            >
              +
            </button>
          </div>
          <button
            type="button"
            onClick={handleAdd}
            className="flex h-12 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#2d5258] bg-[#447C84] px-4 text-sm font-bold text-white shadow-btn-bismark transition-all duration-200 hover:brightness-105 active:scale-[0.99]"
          >
            <Icon name={editing ? 'edit' : 'add_shopping_cart'} className="text-[19px]" />
            <span className="font-display tracking-wide">
              {editing ? 'Save Changes' : 'Add to Order'} • {formatRupiah(lineTotal)}
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}
