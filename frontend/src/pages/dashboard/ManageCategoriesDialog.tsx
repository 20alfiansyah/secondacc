import { useEffect, useState } from 'react'
import type { Category } from '@/api/client'
import { createCategory, deleteCategory, renameCategory } from '@/api/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Icon from '@/components/ui/Icon'
import { cn } from '@/lib/utils'

/**
 * Dialog manajemen kategori (Menu Management): daftar kategori + rename +
 * delete + tambah. Server error ditampilkan apa adanya (pola AddChannelDialog).
 * Mutasi sukses memanggil `onSaved` — parent re-fetch categories sehingga
 * pills & dropdown form produk ikut ter-refresh; dialog tetap terbuka.
 */
export default function ManageCategoriesDialog({
  categories,
  onClose,
  onSaved,
}: {
  categories: Category[]
  onClose: () => void
  onSaved: (message: string) => void
}) {
  // id kategori yang sedang mode rename (inline input swap) / request berjalan.
  const [renamingId, setRenamingId] = useState<number | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [busyId, setBusyId] = useState<number | null>(null)
  const [newName, setNewName] = useState('')
  const [serverError, setServerError] = useState<string | null>(null)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function extractError(err: unknown, fallback: string): string | null {
    if (err && typeof err === 'object' && 'isAxiosError' in err) {
      const data = (err as { response?: { data?: { message?: string } } }).response?.data
      if (data && typeof data.message === 'string' && data.message.length > 0) return data.message
    }
    return fallback
  }

  async function runMutation(id: number, action: () => Promise<void>, successMsg: string) {
    setBusyId(id)
    setServerError(null)
    try {
      await action()
      onSaved(successMsg)
    } catch (err) {
      // Pesan server verbatim: 409 SLUG_TAKEN / 400 "Category still has N product(s)".
      setServerError(extractError(err, 'Failed to update category. Try again.'))
    } finally {
      setBusyId(null)
    }
  }

  function startRename(category: Category) {
    setRenamingId(category.id)
    setRenameValue(category.name)
  }

  async function submitRename(id: number) {
    const name = renameValue.trim()
    if (!name) return
    await runMutation(
      id,
      async () => {
        await renameCategory(id, name)
      },
      'Category renamed.',
    )
    setRenamingId(null)
  }

  async function handleDelete(category: Category) {
    // KISS: native confirm cukup untuk admin-only flow.
    if (!window.confirm(`Delete category "${category.name}"?`)) return
    await runMutation(category.id, () => deleteCategory(category.id), 'Category deleted.')
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    const name = newName.trim()
    if (!name) return
    setBusyId(-1)
    setServerError(null)
    try {
      await createCategory(name)
      setNewName('')
      onSaved('Category added.')
    } catch (err) {
      setServerError(extractError(err, 'Failed to add category. Try again.'))
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
          <h2 className="font-display text-lg font-bold text-slate-900">Manage Categories</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-800"
          >
            <Icon name="close" className="text-lg" />
          </button>
        </div>

        {/* Daftar kategori: count badge + rename inline + delete (disabled saat ada produk). */}
        <div className="mb-4 max-h-72 space-y-2 overflow-y-auto">
          {categories.length === 0 ? (
            <p className="rounded-xl bg-slate-50 px-3.5 py-3 text-xs text-slate-500">
              No categories yet. Add the first one below.
            </p>
          ) : (
            categories.map((category) => (
              <div
                key={category.id}
                className="flex items-center gap-2 rounded-xl border border-border/70 bg-white px-3.5 py-2.5"
              >
                <div className="min-w-0 flex-1">
                  {renamingId === category.id ? (
                    <input
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') void submitRename(category.id)
                        if (e.key === 'Escape') setRenamingId(null)
                      }}
                      autoFocus
                      className="h-8 w-full rounded-lg border border-input/80 bg-background px-2.5 text-sm shadow-subtle transition-all focus-visible:border-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
                      aria-label="Edit category name"
                    />
                  ) : (
                    <p className="truncate font-display text-sm font-bold text-foreground">
                      {category.name}
                    </p>
                  )}
                </div>
                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-slate-600">
                  {category.activeProductCount}
                </span>
                {renamingId === category.id ? (
                  <>
                    <Button
                      variant="outline"
                      size="icon"
                      aria-label="Confirm rename"
                      disabled={busyId === category.id}
                      onClick={() => void submitRename(category.id)}
                    >
                      <Icon name="check_circle" className="text-sm text-[#447C84]" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Cancel rename"
                      onClick={() => setRenamingId(null)}
                    >
                      <Icon name="close" className="text-sm text-slate-400" />
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Rename ${category.name}`}
                      disabled={busyId === category.id}
                      onClick={() => startRename(category)}
                    >
                      <Icon name="edit" className="text-sm text-slate-500" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Delete ${category.name}`}
                      disabled={busyId === category.id || category.activeProductCount > 0}
                      title={
                        category.activeProductCount > 0 ? 'Category still has products' : undefined
                      }
                      onClick={() => void handleDelete(category)}
                    >
                      <Icon
                        name="delete"
                        className={cn(
                          'text-sm',
                          category.activeProductCount > 0 ? 'text-slate-300' : 'text-slate-500',
                        )}
                      />
                    </Button>
                  </>
                )}
              </div>
            ))
          )}
        </div>

        {/* Form tambah: Enter submit; server error ditampilkan verbatim di bawah input. */}
        <form onSubmit={handleAdd} className="space-y-2">
          <label
            htmlFor="new-category-name"
            className="block font-display text-xs font-bold uppercase tracking-wider text-slate-400"
          >
            New Category
          </label>
          <div className="flex gap-2">
            <Input
              id="new-category-name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="New category name"
              maxLength={50}
            />
            <Button type="submit" disabled={busyId === -1 || !newName.trim()}>
              <Icon name="add" className="text-sm" />
              Add
            </Button>
          </div>
          {serverError && (
            <p
              role="alert"
              className="rounded-xl bg-destructive/10 px-3.5 py-2.5 text-xs font-semibold text-destructive"
            >
              {serverError}
            </p>
          )}
        </form>
      </div>
    </div>
  )
}
