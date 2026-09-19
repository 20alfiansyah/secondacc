import { isAxiosError } from 'axios'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent, ReactNode } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  createProduct,
  deleteProduct,
  fetchCategories,
  fetchProducts,
  toggleProductAvailability,
  updateProduct,
} from '@/api/client'
import type { Category, Product } from '@/api/client'
import { formatRupiah } from '@/utils/format'
import Icon from '@/components/ui/Icon'
import EmptyState from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

/** Validasi harga: string input harus bilangan bulat positif (rupiah integer). */
function parsePriceInput(value: string): number | null {
  if (!/^\d+$/.test(value)) return null
  const parsed = Number.parseInt(value, 10)
  return parsed > 0 ? parsed : null
}
function extractErrorMessage(err: unknown, fallback: string): string {
  if (!isAxiosError(err)) return fallback
  // Kontrak error backend: { code, message } di error.response.data (docs §6.2).
  const data: unknown = err.response?.data
  if (typeof data === 'object' && data !== null && 'message' in data) {
    const message: unknown = data.message
    if (typeof message === 'string' && message.length > 0) return message
  }
  return fallback
}

export default function MenuPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [pageError, setPageError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  // Toggle sold out per produk (disable tombol saat request berjalan).
  const [togglingId, setTogglingId] = useState<number | null>(null)

  // Form modal create/edit — `editing` null berarti mode create.
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)

  // Modal konfirmasi delete.
  const [deleting, setDeleting] = useState<Product | null>(null)
  const [deletingBusy, setDeletingBusy] = useState(false)

  const loadProducts = useCallback(async () => {
    try {
      const [products, categories] = await Promise.all([fetchProducts(), fetchCategories()])
      setProducts(products)
      setCategories(categories)
      setPageError(null)
    } catch (err) {
      setPageError(extractErrorMessage(err, 'Gagal memuat data menu.'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadProducts()
  }, [loadProducts])

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return products
    return products.filter(
      (p) => p.name.toLowerCase().includes(q) || p.categoryName.toLowerCase().includes(q),
    )
  }, [products, search])

  async function handleToggleSoldOut(product: Product) {
    setTogglingId(product.id)
    try {
      const updated = await toggleProductAvailability(product.id)
      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, isAvailable: updated.isAvailable } : p)),
      )
    } catch (err) {
      setPageError(extractErrorMessage(err, `Gagal mengubah status ${product.name}.`))
    } finally {
      setTogglingId(null)
    }
  }

  async function handleConfirmDelete() {
    if (!deleting) return
    setDeletingBusy(true)
    try {
      await deleteProduct(deleting.id)
      setDeleting(null)
      void loadProducts()
    } catch (err) {
      // 409 PRODUCT_IN_USE dll — tampilkan pesan server bila ada.
      setPageError(extractErrorMessage(err, `Gagal menghapus ${deleting.name}.`))
      setDeleting(null)
    } finally {
      setDeletingBusy(false)
    }
  }

  function openCreate() {
    setEditing(null)
    setFormOpen(true)
  }

  function openEdit(product: Product) {
    setEditing(product)
    setFormOpen(true)
  }

  return (
    <div className="space-y-4">
      {pageError && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-sm font-medium text-destructive"
        >
          <Icon name="error" className="shrink-0 text-base" />
          <span className="min-w-0 flex-1">{pageError}</span>
          <button
            type="button"
            onClick={() => setPageError(null)}
            className="cursor-pointer rounded-full p-0.5 hover:bg-destructive/10"
            aria-label="Tutup pesan error"
          >
            <Icon name="close" className="text-[16px]" />
          </button>
        </div>
      )}

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="font-display text-base">Manajemen Menu</CardTitle>
            <CardDescription>
              {loading ? 'Memuat produk…' : `${products.length} produk terdaftar`}
            </CardDescription>
          </div>
          <Button onClick={openCreate} disabled={loading}>
            <Icon name="add" className="text-[18px]" />
            Tambah Produk
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Icon
              name="search"
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[18px] text-slate-400"
            />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari produk atau kategori…"
              className="pl-10"
              aria-label="Cari produk"
            />
          </div>

          {loading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {Array.from({ length: 4 }, (_, i) => (
                <EmptyState
                  key={i}
                  icon="restaurant_menu"
                  title="Memuat…"
                  loading
                  compact
                />
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <EmptyState
              icon="inventory_2"
              title={products.length === 0 ? 'Belum ada produk' : 'Produk tidak ditemukan'}
              description={
                products.length === 0
                  ? 'Tambahkan produk pertama lewat tombol "Tambah Produk".'
                  : `Tidak ada produk yang cocok dengan pencarian "${search}".`
              }
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  toggling={togglingId === product.id}
                  onToggleSoldOut={handleToggleSoldOut}
                  onEdit={openEdit}
                  onDelete={setDeleting}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {formOpen && (
        <ProductFormModal
          key={editing?.id ?? 'new'}
          editing={editing}
          categories={categories}
          onClose={() => setFormOpen(false)}
          onSaved={(message) => {
            setFormOpen(false)
            setNotice(message)
            void loadProducts()
          }}
        />
      )}

      {deleting && (
        <DeleteConfirmModal
          product={deleting}
          busy={deletingBusy}
          onClose={() => setDeleting(null)}
          onConfirm={handleConfirmDelete}
        />
      )}

      {notice && <AutoHideNotice message={notice} onDone={() => setNotice(null)} />}
    </div>
  )
}

/** Satu kartu produk: thumbnail, nama, kategori, harga, badge, dan aksi admin. */
function ProductCard({
  product,
  toggling,
  onToggleSoldOut,
  onEdit,
  onDelete,
}: {
  product: Product
  toggling: boolean
  onToggleSoldOut: (product: Product) => void
  onEdit: (product: Product) => void
  onDelete: (product: Product) => void
}) {
  const soldOut = !product.isAvailable

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-border/70 bg-card shadow-card transition-all hover:shadow-card-hover">
      {/* Thumbnail — imageUrl /uploads/... dipakai langsung (proxy Vite ke backend). */}
      <div className="relative aspect-square overflow-hidden bg-slate-100">
        <div className="absolute inset-0 flex items-center justify-center text-slate-300">
          <Icon name="restaurant_menu" className="text-[40px]" />
        </div>
        {product.imageUrl && (
          <img
            src={product.imageUrl}
            alt={product.name}
            loading="lazy"
            onError={(e) => {
              ;(e.target as HTMLImageElement).style.display = 'none'
            }}
            className={cn('absolute inset-0 h-full w-full object-cover', soldOut && 'grayscale')}
          />
        )}
        <div className="absolute left-2 top-2 flex flex-wrap gap-1">
          {product.isRecommended && (
            <span className="flex items-center gap-0.5 rounded-full bg-primary-light px-2 py-0.5 text-[10px] font-bold text-primary-dark">
              <Icon name="star" className="text-[11px]" />
              Recommended
            </span>
          )}
          {product.isBestSeller && (
            <span className="flex items-center gap-0.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-2 py-0.5 text-[10px] font-bold text-white">
              <Icon name="local_fire_department" className="text-[11px]" />
              BestSeller
            </span>
          )}
        </div>
        {soldOut && (
          <span className="absolute right-2 top-2 rounded-full bg-slate-900/80 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
            Sold Out
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3.5">
        <div className="min-w-0">
          <h3 className="truncate font-display text-sm font-bold text-slate-900">{product.name}</h3>
          <p className="truncate text-[11px] text-muted-foreground">{product.categoryName}</p>
        </div>
        <div className="flex items-center justify-between">
          <span className="font-display text-sm font-bold tabular-nums text-primary">
            {formatRupiah(product.price)}
          </span>
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-[10px] font-bold',
              product.isAvailable
                ? 'bg-accent text-[#2d5258]'
                : 'bg-destructive/10 text-destructive',
            )}
          >
            {product.isAvailable ? 'Tersedia' : 'Sold Out'}
          </span>
        </div>

        <div className="mt-auto flex items-center gap-1.5 border-t border-slate-100 pt-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onToggleSoldOut(product)}
            disabled={toggling}
          >
            <Icon name="sync" className={cn('text-[15px]', toggling && 'animate-spin')} />
            {product.isAvailable ? 'Sold Out' : 'Tersedia'}
          </Button>
          <div className="ml-auto flex items-center gap-1">
            <button
              type="button"
              onClick={() => onEdit(product)}
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-primary"
              aria-label={`Edit ${product.name}`}
              title="Edit"
            >
              <Icon name="edit_note" className="text-[18px]" />
            </button>
            <button
              type="button"
              onClick={() => onDelete(product)}
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-slate-500 transition hover:bg-destructive/10 hover:text-destructive"
              aria-label={`Hapus ${product.name}`}
              title="Hapus"
            >
              <Icon name="delete" className="text-[17px]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/** Modal form create/edit produk — submit berupa FormData (multipart). */
function ProductFormModal({
  editing,
  categories,
  onClose,
  onSaved,
}: {
  editing: Product | null
  categories: Category[]
  onClose: () => void
  onSaved: (message: string) => void
}) {
  const [name, setName] = useState(editing?.name ?? '')
  const [categoryId, setCategoryId] = useState<string>(editing ? String(editing.categoryId) : '')
  const [price, setPrice] = useState(editing ? String(editing.price) : '')
  const [description, setDescription] = useState(editing?.description ?? '')
  const [isRecommended, setIsRecommended] = useState(editing?.isRecommended ?? false)
  const [isBestSeller, setIsBestSeller] = useState(editing?.isBestSeller ?? false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Revoke object URL saat berganti file / modal ditutup.
  useEffect(() => {
    if (!previewUrl) return
    return () => URL.revokeObjectURL(previewUrl)
  }, [previewUrl])

  // Escape menutup modal.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function handleSelectImage(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    setImageFile(file)
    setPreviewUrl(file ? URL.createObjectURL(file) : null)
  }

  function handleSubmit() {
    const trimmedName = name.trim()
    const parsedPrice = parsePriceInput(price.trim())

    if (!trimmedName) {
      setFormError('Nama produk wajib diisi.')
      return
    }
    if (!categoryId) {
      setFormError('Kategori wajib dipilih.')
      return
    }
    if (parsedPrice === null) {
      setFormError('Harga harus berupa bilangan bulat positif (rupiah).')
      return
    }
    // Create: gambar wajib; Edit: opsional (tanpa file = gambar lama dipertahankan).
    if (!editing && !imageFile) {
      setFormError('Gambar produk wajib diupload (JPEG/PNG/WEBP, maks 2MB).')
      return
    }

    const formData = new FormData()
    formData.append('name', trimmedName)
    formData.append('price', String(parsedPrice))
    formData.append('categoryId', categoryId)
    formData.append('description', description.trim())
    formData.append('isRecommended', String(isRecommended))
    formData.append('isBestSeller', String(isBestSeller))
    if (imageFile) formData.append('image', imageFile)

    setSaving(true)
    setFormError(null)
    const request = editing
      ? updateProduct(editing.id, formData)
      : createProduct(formData)
    request
      .then(() => {
        onSaved(editing ? `Produk "${trimmedName}" berhasil diperbarui.` : `Produk "${trimmedName}" berhasil ditambahkan.`)
      })
      .catch((err: unknown) => {
        setFormError(extractErrorMessage(err, editing ? 'Gagal memperbarui produk.' : 'Gagal menambahkan produk.'))
        setSaving(false)
      })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-[2px]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 p-4">
          <h3 className="font-display text-base font-bold tracking-tight text-slate-900">
            {editing ? 'Edit Produk' : 'Tambah Produk'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close"
          >
            <Icon name="close" className="text-[20px]" />
          </button>
        </div>

        <div className="space-y-3.5 p-4">
          {formError && (
            <div
              role="alert"
              className="flex items-center gap-2 rounded-xl bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive"
            >
              <Icon name="error" className="shrink-0 text-[14px]" />
              <span className="min-w-0 flex-1">{formError}</span>
            </div>
          )}

          <Field label="Nama Produk" required>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="cth. Kopi Susu Gula Aren"
              autoFocus
            />
          </Field>

          <Field label="Kategori" required>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="flex h-10 w-full cursor-pointer rounded-xl border border-input/80 bg-background px-3.5 py-2 text-sm shadow-subtle transition-all focus:border-primary/80 focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="">Pilih kategori…</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Harga (Rp)" required>
            <Input
              type="text"
              inputMode="numeric"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="cth. 20000"
              className="tabular-nums"
            />
          </Field>

          <Field label="Deskripsi">
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Deskripsi singkat (opsional)"
              className="w-full resize-none rounded-xl border border-input/80 bg-background px-3.5 py-2 text-sm shadow-subtle transition-all placeholder:text-muted-foreground/60 focus:border-primary/80 focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </Field>

          <Field
            label="Gambar Produk"
            hint={editing ? 'Kosongkan jika tidak diganti (maks 2MB)' : 'JPEG/PNG/WEBP, maks 2MB'}
          >
            <div className="flex items-center gap-3">
              {/* Preview: object URL dari file baru, fallback gambar saat edit. */}
              <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                {previewUrl ? (
                  <img src={previewUrl} alt="Preview gambar" className="h-full w-full object-cover" />
                ) : editing?.imageUrl ? (
                  <img
                    src={editing.imageUrl}
                    alt={editing.name}
                    onError={(e) => {
                      ;(e.target as HTMLImageElement).style.display = 'none'
                    }}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-slate-300">
                    <Icon name="restaurant_menu" className="text-[22px]" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1 space-y-1.5">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleSelectImage}
                  className="block w-full cursor-pointer text-xs text-slate-500 file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-primary-light file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-primary-dark hover:file:bg-accent"
                  aria-label="Pilih file gambar produk"
                />
                {imageFile && (
                  <button
                    type="button"
                    onClick={() => {
                      setImageFile(null)
                      setPreviewUrl(null)
                      if (fileInputRef.current) fileInputRef.current.value = ''
                    }}
                    className="cursor-pointer text-[11px] font-medium text-destructive hover:underline"
                  >
                    Hapus gambar terpilih
                  </button>
                )}
              </div>
            </div>
          </Field>

          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/50 p-3">
            <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 text-xs font-medium text-slate-700">
              <input
                type="checkbox"
                checked={isRecommended}
                onChange={(e) => setIsRecommended(e.target.checked)}
                className="h-4 w-4 cursor-pointer accent-[#447C84]"
              />
              <span className="flex items-center gap-1">
                <Icon name="star" className="text-[13px] text-[#447C84]" />
                Recommended
              </span>
            </label>
            <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 text-xs font-medium text-slate-700">
              <input
                type="checkbox"
                checked={isBestSeller}
                onChange={(e) => setIsBestSeller(e.target.checked)}
                className="h-4 w-4 cursor-pointer accent-[#447C84]"
              />
              <span className="flex items-center gap-1">
                <Icon name="local_fire_department" className="text-[13px] text-amber-500" />
                Best Seller
              </span>
            </label>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 bg-slate-50/50 p-4">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Batal
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            <Icon name={editing ? 'edit_note' : 'add'} className="text-[17px]" />
            {saving ? 'Menyimpan…' : editing ? 'Simpan Perubahan' : 'Tambah Produk'}
          </Button>
        </div>
      </div>
    </div>
  )
}

/** Label field kecil gaya Stitch (uppercase) + wrapper konten. */
function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string
  required?: boolean
  hint?: string
  children: ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center justify-between font-display text-[10px] font-bold uppercase tracking-wider text-slate-400">
        <span>
          {label}
          {required && <span className="ml-0.5 text-destructive">*</span>}
        </span>
        {hint && <span className="font-medium normal-case tracking-normal text-slate-400">{hint}</span>}
      </label>
      {children}
    </div>
  )
}

/** Modal konfirmasi hapus produk. */
function DeleteConfirmModal({
  product,
  busy,
  onClose,
  onConfirm,
}: {
  product: Product
  busy: boolean
  onClose: () => void
  onConfirm: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-[2px]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <div className="space-y-3 p-5 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <Icon name="delete" className="text-[24px]" />
          </div>
          <h3 className="font-display text-base font-bold text-slate-900">Hapus Produk</h3>
          <p className="text-sm leading-relaxed text-slate-600">
            Yakin ingin menghapus{' '}
            <span className="font-semibold text-slate-900">"{product.name}"</span>? Tindakan ini
            tidak dapat dibatalkan.
          </p>
        </div>
        <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 bg-slate-50/50 p-4">
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Batal
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={busy}>
            {busy ? 'Menghapus…' : 'Ya, Hapus'}
          </Button>
        </div>
      </div>
    </div>
  )
}

/** Banner sukses non-modal, auto-hide 4 detik (pola feedback POS). */
function AutoHideNotice({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => {
    const timer = window.setTimeout(onDone, 4000)
    return () => window.clearTimeout(timer)
  }, [message, onDone])

  return (
    <div
      role="status"
      className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2 rounded-xl border border-[#b9e2d3] bg-[#edf7f3] px-4 py-2.5 text-sm font-medium text-[#2d5258] shadow-card"
    >
      <div className="flex items-center gap-2">
        <Icon name="check_circle" className="text-[18px] text-[#65AF92]" />
        <span>{message}</span>
      </div>
    </div>
  )
}
