import { isAxiosError } from 'axios'
import { useEffect, useState } from 'react'
import type { Product } from '@/api/client'
import { fetchArchivedProducts, restoreProduct } from '@/api/client'
import { Button } from '@/components/ui/button'
import Icon from '@/components/ui/Icon'
import EmptyState from '@/components/ui/EmptyState'
import { formatRupiah } from '@/utils/format'

/**
 * Dialog daftar produk terarsip (Menu Management) dengan aksi Restore per
 * baris. List dimuat sekali saat dialog dibuka; restore sukses menghapus
 * baris dari list lokal dan memanggil `onSaved` — parent menampilkan notice
 * + re-fetch menu aktif, dialog tetap terbuka (pola ManageCategoriesDialog).
 * Server error ditampilkan apa adanya di bawah list (pola AddChannelDialog).
 */
export default function ArchivedProductsDialog({
  onClose,
  onSaved,
}: {
  onClose: () => void
  onSaved: (message: string) => void
}) {
  // null = list sedang dimuat; [] = kosong.
  const [archived, setArchived] = useState<Product[] | null>(null)
  // id produk yang sedang di-restore (disable tombol baris tsb saja).
  const [busyId, setBusyId] = useState<number | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchArchivedProducts()
      .then((rows) => {
        if (!cancelled) setArchived(rows)
      })
      .catch(() => {
        // Dialog tetap terpakai; tampilkan sebagai list kosong saat gagal.
        if (!cancelled) setArchived([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function extractError(err: unknown, fallback: string): string {
    if (!isAxiosError(err)) return fallback
    // Kontrak error backend: { code, message } di error.response.data (docs §6.2).
    const data: unknown = err.response?.data
    if (typeof data === 'object' && data !== null && 'message' in data) {
      const message: unknown = data.message
      if (typeof message === 'string' && message.length > 0) return message
    }
    return fallback
  }

  async function handleRestore(product: Product) {
    setBusyId(product.id)
    setServerError(null)
    try {
      await restoreProduct(product.id)
      // Baris hilang dari daftar lokal; parent re-fetch menu aktif via onSaved.
      setArchived((prev) => (prev ?? []).filter((p) => p.id !== product.id))
      onSaved(`"${product.name}" restored to the menu.`)
    } catch (err) {
      setServerError(extractError(err, `Failed to restore ${product.name}.`))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="flex max-h-[85vh] w-full max-w-md flex-col rounded-2xl border border-slate-100 bg-white p-6 shadow-modal animate-in zoom-in-95 duration-150">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-slate-900">Archived Products</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-800"
          >
            <Icon name="close" className="text-lg" />
          </button>
        </div>

        {/* Daftar produk terarsip: nama + kategori · harga + tombol Restore. */}
        <div className="mb-4 max-h-72 space-y-2 overflow-y-auto">
          {archived === null ? (
            <EmptyState icon="inventory_2" title="Loading…" loading compact />
          ) : archived.length === 0 ? (
            <EmptyState
              icon="inventory_2"
              title="No archived products"
              description="Products you archive will appear here so you can restore them."
              compact
            />
          ) : (
            archived.map((product) => (
              <div
                key={product.id}
                className="flex items-center gap-2 rounded-xl border border-border/70 bg-slate-50 px-3.5 py-2.5"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{product.name}</p>
                  <p className="truncate text-xs text-slate-400">
                    {product.categoryName} · {formatRupiah(product.price)}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  aria-label={`Restore ${product.name}`}
                  disabled={busyId === product.id}
                  onClick={() => void handleRestore(product)}
                >
                  <Icon name="restore" className="text-sm" />
                  Restore
                </Button>
              </div>
            ))
          )}
        </div>

        {/* Pesan server verbatim (mis. 404/409 dari endpoint restore). */}
        {serverError && (
          <p
            role="alert"
            className="rounded-xl bg-destructive/10 px-3.5 py-2.5 text-xs font-semibold text-destructive"
          >
            {serverError}
          </p>
        )}
      </div>
    </div>
  )
}
