import { useEffect, useState } from 'react'
import { Check, Minus, Plus, ShoppingBag, SlidersHorizontal, X } from 'lucide-react'
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

const SUGAR_OPTIONS = [
  { label: 'No Sugar (0%)', value: 'No Sugar' },
  { label: 'Less Sugar (50%)', value: 'Less Sugar' },
  { label: 'Normal Sugar (100%)', value: 'Normal Sugar' },
  { label: 'Extra Sugar (120%)', value: 'Extra Sugar' },
]

const ICE_OPTIONS = [
  { label: 'Ice (Dingin)', value: 'Ice' },
  { label: 'Less Ice', value: 'Less Ice' },
  { label: 'No Ice', value: 'No Ice' },
  { label: 'Hot (Panas)', value: 'Hot' },
]

const SPICE_OPTIONS = [
  { label: 'Tidak Pedas', value: 'Tidak Pedas' },
  { label: 'Pedas Sedang', value: 'Pedas Sedang' },
  { label: 'Pedas', value: 'Pedas' },
  { label: 'Ekstra Pedas 🔥', value: 'Ekstra Pedas' },
]

const QUICK_TAGS_DRINK = ['Oat Milk', 'Extra Shot', 'Gula Pisah', 'Sedikit Es']
const QUICK_TAGS_FOOD = ['Sambal Pisah', 'Telur Matang', 'Telur 1/2 Matang', 'Hangatkan', 'Tanpa Bawang']

export default function CustomItemModal({
  product,
  isOpen,
  onClose,
  onConfirm,
}: CustomItemModalProps) {
  const [selectedSugar, setSelectedSugar] = useState<string>('Normal Sugar')
  const [selectedIce, setSelectedIce] = useState<string>('Ice')
  const [selectedSpice, setSelectedSpice] = useState<string>('Pedas Sedang')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [customNote, setCustomNote] = useState('')
  const [quantity, setQuantity] = useState(1)

  // Reset form saat modal dibuka dengan produk baru
  useEffect(() => {
    if (isOpen && product) {
      setSelectedSugar('Normal Sugar')
      setSelectedIce('Ice')
      setSelectedSpice('Pedas Sedang')
      setSelectedTags([])
      setCustomNote('')
      setQuantity(1)
    }
  }, [isOpen, product])

  if (!isOpen || !product) return null

  const isDrink =
    product.categoryName.toLowerCase().includes('kopi') ||
    product.categoryName.toLowerCase().includes('drink') ||
    product.categoryName.toLowerCase().includes('tea') ||
    product.categoryName.toLowerCase().includes('non')

  function toggleTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    )
  }

  function handleSave() {
    if (!product) return

    const parts: string[] = []
    if (isDrink) {
      if (selectedSugar) parts.push(selectedSugar)
      if (selectedIce) parts.push(selectedIce)
    } else {
      if (selectedSpice) parts.push(selectedSpice)
    }

    if (selectedTags.length > 0) {
      parts.push(...selectedTags)
    }

    if (customNote.trim()) {
      parts.push(customNote.trim())
    }

    const notes = parts.join(', ')
    onConfirm(product, { notes: notes || undefined, quantity })
    onClose()
  }

  const imageUrl = getProductImage(product.name, product.categoryName)
  const lineTotal = product.price * quantity

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg overflow-hidden rounded-3xl border border-border/80 bg-card shadow-modal animate-in zoom-in-95 duration-150">
        {/* Header Modal */}
        <div className="flex items-center justify-between border-b border-border/70 px-5 py-3.5 bg-muted/30">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <SlidersHorizontal className="h-4 w-4" />
            </div>
            <h2 className="text-sm font-bold text-foreground">Kustomisasi Pesanan</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body Konten */}
        <div className="max-h-[75vh] overflow-y-auto p-5 space-y-5">
          {/* Info Produk Ringkas */}
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
              <h3 className="mt-1 text-sm font-bold text-foreground truncate">{product.name}</h3>
              <p className="text-sm font-extrabold text-primary tabular-nums">
                {formatRupiah(product.price)}
              </p>
            </div>
          </div>

          {/* Opsi Minuman: Sugar & Ice Level */}
          {isDrink ? (
            <>
              {/* Sugar Level */}
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Tingkat Kemanisan (Sugar Level)
                </label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {SUGAR_OPTIONS.map((opt) => {
                    const active = selectedSugar === opt.value
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setSelectedSugar(opt.value)}
                        className={cn(
                          'rounded-xl border p-2 text-center text-xs font-semibold transition-all duration-150 active:scale-95',
                          active
                            ? 'border-primary bg-primary text-primary-foreground shadow-xs'
                            : 'border-border/80 bg-background hover:bg-accent text-foreground',
                        )}
                      >
                        {opt.label.split(' ')[0]} {opt.label.split(' ')[1]}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Temperature / Ice Level */}
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Suhu / Es (Ice Level)
                </label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {ICE_OPTIONS.map((opt) => {
                    const active = selectedIce === opt.value
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setSelectedIce(opt.value)}
                        className={cn(
                          'rounded-xl border p-2 text-center text-xs font-semibold transition-all duration-150 active:scale-95',
                          active
                            ? 'border-primary bg-primary text-primary-foreground shadow-xs'
                            : 'border-border/80 bg-background hover:bg-accent text-foreground',
                        )}
                      >
                        {opt.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Quick Tags Minuman */}
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Opsi Tambahan
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_TAGS_DRINK.map((tag) => {
                    const active = selectedTags.includes(tag)
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleTag(tag)}
                        className={cn(
                          'flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition-all active:scale-95',
                          active
                            ? 'border-primary bg-primary/10 text-primary font-bold shadow-xs'
                            : 'border-border/80 bg-background hover:bg-accent text-foreground',
                        )}
                      >
                        {active && <Check className="h-3 w-3 text-primary" />}
                        {tag}
                      </button>
                    )
                  })}
                </div>
              </div>
            </>
          ) : (
            /* Opsi Makanan / Snack: Pedas & Tags */
            <>
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Tingkat Kepedasan
                </label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {SPICE_OPTIONS.map((opt) => {
                    const active = selectedSpice === opt.value
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setSelectedSpice(opt.value)}
                        className={cn(
                          'rounded-xl border p-2 text-center text-xs font-semibold transition-all duration-150 active:scale-95',
                          active
                            ? 'border-primary bg-primary text-primary-foreground shadow-xs'
                            : 'border-border/80 bg-background hover:bg-accent text-foreground',
                        )}
                      >
                        {opt.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Opsi Tambahan
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_TAGS_FOOD.map((tag) => {
                    const active = selectedTags.includes(tag)
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleTag(tag)}
                        className={cn(
                          'flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition-all active:scale-95',
                          active
                            ? 'border-primary bg-primary/10 text-primary font-bold shadow-xs'
                            : 'border-border/80 bg-background hover:bg-accent text-foreground',
                        )}
                      >
                        {active && <Check className="h-3 w-3 text-primary" />}
                        {tag}
                      </button>
                    )
                  })}
                </div>
              </div>
            </>
          )}

          {/* Input Catatan Manual */}
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Catatan Khusus Lainnya
            </label>
            <input
              type="text"
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
              placeholder="Misal: jangan pakai sedotan, cup terpisah, dll..."
              className="h-10 w-full rounded-xl border border-input/80 bg-background px-3.5 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none"
            />
          </div>

          {/* Stepper Jumlah Qty */}
          <div className="flex items-center justify-between rounded-2xl border border-border/80 bg-secondary/30 p-3">
            <span className="text-xs font-bold text-foreground uppercase tracking-wider">
              Jumlah Item
            </span>
            <div className="flex items-center gap-2 rounded-xl border border-border/80 bg-card p-1">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-muted text-foreground transition-colors active:scale-90"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="w-8 text-center text-sm font-black tabular-nums text-foreground">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => setQuantity((q) => q + 1)}
                className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-muted text-foreground transition-colors active:scale-90"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Footer Modal CTA */}
        <div className="flex items-center justify-between border-t border-border/80 bg-card p-4">
          <div>
            <p className="text-[11px] font-medium text-muted-foreground">Subtotal Custom</p>
            <p className="text-base font-black text-foreground tabular-nums">
              {formatRupiah(lineTotal)}
            </p>
          </div>
          <Button onClick={handleSave} className="h-11 px-6 font-bold shadow-sm">
            <ShoppingBag className="h-4 w-4" />
            Tambahkan ke Keranjang
          </Button>
        </div>
      </div>
    </div>
  )
}
