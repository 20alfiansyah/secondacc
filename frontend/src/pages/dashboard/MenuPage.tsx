import { isAxiosError } from 'axios'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent, ReactNode } from 'react'
import ProductCard from '@/components/ProductCard'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import {
  createProduct,
  archiveProduct,
  fetchCategories,
  fetchProducts,
  toggleProductAvailability,
  updateProduct,
} from '@/api/client'
import type { Category, Product } from '@/api/client'
import ManageCategoriesDialog from './ManageCategoriesDialog'
import ArchivedProductsDialog from './ArchivedProductsDialog'
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

  // Modal konfirmasi arsip produk (soft-delete, riwayat order tetap utuh).
  const [archiving, setArchiving] = useState<Product | null>(null)
  const [archivingBusy, setArchivingBusy] = useState(false)

  // Dialog manajemen kategori (CRUD kategori oleh admin).
  const [catsOpen, setCatsOpen] = useState(false)

  // Dialog daftar produk terarsip (restore produk oleh admin).
  const [archivedOpen, setArchivedOpen] = useState(false)

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

/** Lucide glyph per nama kategori (sama dengan POS ProductCatalogGrid). */
function categoryGlyph(name: string): string {
  const lower = name.toLowerCase()
  if (lower.includes('coffee') || lower.includes('espresso') || lower.includes('kopi')) return 'coffee'
  if (lower.includes('tea') || lower.includes('beverage') || lower.includes('non-coffee') || lower.includes('drink'))
    return 'emoji_food_beverage'
  if (lower.includes('pastry') || lower.includes('bakery') || lower.includes('roti') || lower.includes('bread'))
    return 'bakery_dining'
  if (lower.includes('main') || lower.includes('dessert') || lower.includes('cake') || lower.includes('makanan'))
    return 'cake'
  if (lower.includes('snack') || lower.includes('cemilan')) return 'cookie'
  return 'restaurant'
}

/** Grup section utk tab "All": tiap kategori (urutan kategori) — pola POS. */
function groupByCategory(products: Product[]): { title: string; items: Product[] }[] {
  const byCategory = new Map<string, Product[]>()
  for (const p of products) {
    const list = byCategory.get(p.categoryName) ?? []
    list.push(p)
    byCategory.set(p.categoryName, list)
  }
  return Array.from(byCategory, ([title, items]) => ({ title, items }))
}

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

  // Section "All" per kategori (urutan kemunculan produk = urutan kategori) — pola POS.
  const groupedProducts = useMemo(
    () => groupByCategory(filteredProducts),
    [filteredProducts],
  )

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

  async function handleConfirmArchive() {
    if (!archiving) return
    setArchivingBusy(true)
    try {
      await archiveProduct(archiving.id)
      setArchiving(null)
      setNotice('Product archived.')
      void loadProducts()
    } catch (err) {
      setPageError(extractErrorMessage(err, `Failed to archive ${archiving.name}.`))
      setArchiving(null)
    } finally {
      setArchivingBusy(false)
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
        <CardHeader className="flex flex-col items-start gap-3 space-y-0 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="space-y-0.5">
            {/* Header band gaya POS (band MENU CATALOG): ikon + judul uppercase + separator + badge. */}
            <div className="flex items-center gap-2">
              <Icon name="restaurant_menu" className="text-[20px] text-[#447C84]" />
              <span className="font-display text-xs font-bold uppercase tracking-wider text-slate-900">MENU MANAGEMENT</span>
              <div className="hidden h-4 w-px bg-slate-200 md:block" />
              {loading ? (
                <span className="text-xs text-slate-400">Loading products…</span>
              ) : (
                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-slate-600">
                  {products.length} products
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">Manage your cafe menu, prices, categories, and availability.</p>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 p-4 pt-0 sm:p-6 sm:pt-0">
          {/* Baris kontrol: mobile = search full width di atas, tombol di bawah; >=sm: search + CTA sebaris. */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2">
            <div className="min-w-0 sm:flex-1">
              <SearchBar value={search} onChange={setSearch} ariaLabel="Search products" />
            </div>
            {/* Mobile: Categories + Archived sebaris full width; Add Product sendiri di baris bawah. >=sm: semua sebaris via contents. */}
            <div className="flex w-full items-center gap-2 sm:contents">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCatsOpen(true)}
                disabled={loading}
                className="h-[30px] flex-1 justify-center rounded-lg px-3 text-xs font-semibold sm:flex-none"
              >
                <Icon name="category" className="text-sm" />
                Categories
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setArchivedOpen(true)}
                disabled={loading}
                aria-label="Archived products"
                className="h-[30px] flex-1 justify-center rounded-lg px-3 text-xs font-semibold sm:flex-none"
              >
                <Icon name="inventory_2" className="text-sm" />
                Archived
              </Button>
            </div>
            <PrimaryAction
              onClick={openCreate}
              disabled={loading}
              className="w-full justify-center sm:w-auto sm:flex-none"
            >
              <Icon name="add" className="text-sm" />
              Add Product
            </PrimaryAction>
          </div>

          {/* Pills kategori gaya POS: All + Popular + Best Seller + tiap kategori. */}
          {!loading && (
            <div className="flex flex-wrap items-center gap-1.5">
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
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
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
            activeCategory === 'all' ? (
              // Tab "All": dikelompokkan per kategori (pola POS ProductCatalogGrid).
              <div className="space-y-6">
                {groupedProducts.map((section) => (
                  <section key={section.title} className="space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-200/80 pb-1">
                      <div className="flex items-center gap-2">
                        <Icon name={categoryGlyph(section.title)} className="text-[18px] text-[#447C84]" />
                        <h3 className="font-display text-xs font-bold uppercase tracking-wider text-slate-900">
                          {section.title}
                        </h3>
                        <span className="rounded-full border border-slate-200/80 bg-slate-100 px-2 py-0.5 text-[10px] font-semibold tabular-nums text-slate-600">
                          {section.items.length} {section.items.length === 1 ? 'Item' : 'Items'}
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                      {section.items.map((product) => (
                        <ProductCard
                          key={product.id}
                          product={product}
                          subtitle={product.categoryName}
                          actions={
                            <ProductActions
                              toggling={togglingId === product.id}
                              product={product}
                              onToggleSoldOut={handleToggleSoldOut}
                              onEdit={openEdit}
                              onDelete={setArchiving}
                            />
                          }
                        />
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
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
                        onDelete={setArchiving}
                      />
                    }
                  />
                ))}
              </div>
            )
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

      {catsOpen && (
        <ManageCategoriesDialog
          categories={categories}
          onClose={() => setCatsOpen(false)}
          onSaved={(message) => {
            // Dialog tetap terbuka; parent re-fetch supaya pills & dropdown refresh.
            setNotice(message)
            void loadProducts()
          }}
        />
      )}

      {archivedOpen && (
        <ArchivedProductsDialog
          onClose={() => setArchivedOpen(false)}
          onSaved={(message) => {
            // Dialog tetap terbuka (pola ManageCategoriesDialog); parent
            // menampilkan notice + re-fetch menu sehingga produk yang
            // di-restore langsung muncul kembali di grid.
            setNotice(message)
            void loadProducts()
          }}
        />
      )}

      {archiving && (
        <ArchiveConfirmModal
          product={archiving}
          busy={archivingBusy}
          onClose={() => setArchiving(null)}
          onConfirm={handleConfirmArchive}
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
        aria-label={product.isAvailable ? 'Tandai sold out' : 'Tandai tersedia'}
        className="px-2 sm:px-3"
      >
        <Icon name="sync" className={cn('text-[15px]', toggling && 'animate-spin')} />
        <span className="hidden sm:inline">{product.isAvailable ? 'Sold Out' : 'Available'}</span>
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

/** Modal konfirmasi arsip produk. */
function ArchiveConfirmModal({
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
          <h3 className="font-display text-base font-bold text-slate-900">Archive Product</h3>
          <p className="text-sm leading-relaxed text-slate-600">
            Are you sure you want to archive{' '}
            <span className="font-semibold text-slate-900">"{product.name}"</span>? It will be
            hidden from the menu and POS. Order history stays intact.
          </p>
        </div>
        <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 bg-slate-50/50 p-4">
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={busy}>
            {busy ? 'Archiving…' : 'Yes, Archive'}
          </Button>
        </div>
      </div>
    </div>
  )
}
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
