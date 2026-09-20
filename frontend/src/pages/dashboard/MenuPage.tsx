import { isAxiosError } from 'axios'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent, ReactNode } from 'react'
import ProductCard from '@/components/ProductCard'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import {
  createProduct,
  deleteProduct,
  fetchCategories,
  fetchProducts,
  toggleProductAvailability,
  updateProduct,
} from '@/api/client'
import type { Category, Product } from '@/api/client'
import Icon from '@/components/ui/Icon'
import EmptyState from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import PrimaryAction from '@/components/ui/PrimaryAction'
import SearchBar from '@/components/ui/SearchBar'
import type { CategoryFilter } from '@/components/CategoryFilterBar'
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
  // Filter kategori gaya POS: 'all' | 'recommended' | 'best-seller' | categoryId.
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('all')

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
      setPageError(extractErrorMessage(err, 'Failed to load menu data.'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadProducts()
  }, [loadProducts])

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase()
    return products.filter((p) => {
      if (activeCategory === 'recommended' && !p.isRecommended) return false
      if (activeCategory === 'best-seller' && !p.isBestSeller) return false
      if (typeof activeCategory === 'number' && p.categoryId !== activeCategory) return false
      if (!q) return true
      return p.name.toLowerCase().includes(q) || p.categoryName.toLowerCase().includes(q)
    })
  }, [products, search, activeCategory])

  // Pills kategori gaya POS (CategoryFilterBar): All + Popular + Best Seller +
  // tiap kategori; count dihitung dari produk yang dimuat agar konsisten
  // dengan grid di bawah.
  const pills = useMemo<
    { key: string; label: string; count: number; value: CategoryFilter }[]
  >(() => {
    return [
      { key: 'all', label: 'All', count: products.length, value: 'all' },
      {
        key: 'recommended',
        label: 'Popular',
        count: products.filter((p) => p.isRecommended).length,
        value: 'recommended',
      },
      {
        key: 'best-seller',
        label: 'Best Seller',
        count: products.filter((p) => p.isBestSeller).length,
        value: 'best-seller',
      },
      ...categories.map((c) => ({
        key: `cat-${c.id}`,
        label: c.name,
        count: products.filter((p) => p.categoryId === c.id).length,
        value: c.id,
      })),
    ]
  }, [products, categories])

  async function handleToggleSoldOut(product: Product) {
    setTogglingId(product.id)
    try {
      const updated = await toggleProductAvailability(product.id)
      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, isAvailable: updated.isAvailable } : p)),
      )
    } catch (err) {
      setPageError(extractErrorMessage(err, `Failed to update status of ${product.name}.`))
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
      setPageError(extractErrorMessage(err, `Failed to delete ${deleting.name}.`))
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
            aria-label="Dismiss error"
          >
            <Icon name="close" className="text-[16px]" />
          </button>
        </div>
      )}

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-2">
            <h2 className="font-display text-base font-bold tracking-tight text-slate-900">Menu Management</h2>
            {loading ? (
              <span className="text-xs text-slate-400">Loading products…</span>
            ) : (
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-slate-600">
                {products.length} products
              </span>
            )}
          </div>
          <PrimaryAction onClick={openCreate} disabled={loading}>
            <Icon name="add" className="text-sm" />
            Add Product
          </PrimaryAction>
        </CardHeader>
        <CardContent className="space-y-4">
          <SearchBar value={search} onChange={setSearch} ariaLabel="Search products" />

          {/* Pills kategori gaya POS: All + Popular + Best Seller + tiap kategori. */}
          {!loading && (
            <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto">
              {pills.map((pill) => {
                const isActive = activeCategory === pill.value
                return (
                  <button
                    key={pill.key}
                    onClick={() => setActiveCategory(pill.value)}
                    className={cn(
                      'flex flex-shrink-0 cursor-pointer items-center gap-2 rounded-lg px-3 py-1.5 text-xs shadow-xs transition',
                      isActive
                        ? 'bg-[#447C84] font-semibold text-white'
                        : 'border border-slate-200 bg-white font-medium text-slate-600 shadow-xs hover:bg-slate-50 hover:text-slate-900',
                    )}
                  >
                    <span>{pill.label}</span>
                    <span
                      className={cn(
                        'rounded px-1.5 py-0.5 text-[10px] font-bold tabular-nums',
                        isActive ? 'bg-[#2d5258] text-white' : 'bg-slate-100 text-slate-600 font-semibold',
                      )}
                    >
                      {pill.count}
                    </span>
                  </button>
                )
              })}
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {Array.from({ length: 4 }, (_, i) => (
                <EmptyState
                  key={i}
                  icon="restaurant_menu"
                  title="Loading…"
                  loading
                  compact
                />
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <EmptyState
              icon="inventory_2"
              title={products.length === 0 ? 'No products yet' : 'No products found'}
              description={
                products.length === 0
                  ? 'Add your first product using the "Add Product" button.'
                  : 'No products match your search or category filter.'
              }
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  subtitle={product.categoryName}
                  actions={
                    <ProductActions
                      product={product}
                      toggling={togglingId === product.id}
                      onToggleSoldOut={handleToggleSoldOut}
                      onEdit={openEdit}
                      onDelete={setDeleting}
                    />
                  }
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

/** CTA manajemen per kartu: toggle sold out + edit + delete — slot `actions` shared ProductCard. */
function ProductActions({
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
  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onToggleSoldOut(product)}
        disabled={toggling}
      >
        <Icon name="sync" className={cn('text-[15px]', toggling && 'animate-spin')} />
        {product.isAvailable ? 'Sold Out' : 'Available'}
      </Button>
      <div className="flex items-center gap-1">
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
          aria-label={`Delete ${product.name}`}
          title="Delete"
        >
          <Icon name="delete" className="text-[17px]" />
        </button>
      </div>
    </>
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
      setFormError('Name is required.')
      return
    }
    if (!categoryId) {
      setFormError('Category is required.')
      return
    }
    if (parsedPrice === null) {
      setFormError('Price must be a positive integer.')
      return
    }
    // Create: gambar wajib; Edit: opsional (tanpa file = gambar lama dipertahankan).
    if (!editing && !imageFile) {
      setFormError('Image is required for new products (JPEG/PNG/WEBP, max 2MB).')
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
        onSaved(editing ? `Product "${trimmedName}" updated successfully.` : `Product "${trimmedName}" added successfully.`)
      })
      .catch((err: unknown) => {
        setFormError(extractErrorMessage(err, editing ? 'Failed to update product.' : 'Failed to add product.'))
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
            {editing ? 'Edit Product' : 'Add Product'}
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

          <Field label="Product Name" required>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Iced Latte"
              autoFocus
            />
          </Field>

          <Field label="Category" required>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="flex h-10 w-full cursor-pointer rounded-xl border border-input/80 bg-background px-3.5 py-2 text-sm shadow-subtle transition-all focus:border-primary/80 focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="">Select a category…</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Price (Rp)" required>
            <Input
              type="text"
              inputMode="numeric"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="e.g. 20000"
              className="tabular-nums"
            />
          </Field>

          <Field label="Description">
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short description (optional)"
              className="w-full resize-none rounded-xl border border-input/80 bg-background px-3.5 py-2 text-sm shadow-subtle transition-all placeholder:text-muted-foreground/60 focus:border-primary/80 focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </Field>

          <Field
            label="Product Image"
            hint={editing ? 'Leave empty to keep current (max 2MB)' : 'JPEG/PNG/WEBP, max 2MB'}
          >
            <div className="flex items-center gap-3">
              {/* Preview: object URL dari file baru, fallback gambar saat edit. */}
              <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                {previewUrl ? (
                  <img src={previewUrl} alt="Image preview" className="h-full w-full object-cover" />
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
                  aria-label="Select product image"
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
                    Remove selected image
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
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            <Icon name={editing ? 'edit_note' : 'add'} className="text-[17px]" />
            {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Product'}
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
          <h3 className="font-display text-base font-bold text-slate-900">Delete Product</h3>
          <p className="text-sm leading-relaxed text-slate-600">
            Are you sure you want to delete{' '}
            <span className="font-semibold text-slate-900">"{product.name}"</span>? This action
            cannot be undone.
          </p>
        </div>
        <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 bg-slate-50/50 p-4">
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={busy}>
            {busy ? 'Deleting…' : 'Yes, Delete'}
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
