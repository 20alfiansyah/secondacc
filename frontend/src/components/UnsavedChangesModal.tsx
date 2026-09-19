import { Button } from '@/components/ui/button'
import Icon from '@/components/ui/Icon'

/**
 * Modal konfirmasi "perubahan belum disimpan".
 * Muncul ketika aksi keluar (pindah tiket, navigasi route, sign out, reload)
 * bertemu dengan state yang belum tersimpan. Semua keputusan ada di parent:
 * onSave (Save & Continue), onDiscard, onClose (Keep Editing).
 */
export interface UnsavedChangesModalProps {
  /** true saat proses save berjalan — semua tombol disabled. */
  saving: boolean
  /** "Save & Continue": simpan tiket lalu lanjutkan aksi tertunda. */
  onSave: () => void
  /** "Discard": buang perubahan, langsung jalankan aksi tertunda. */
  onDiscard: () => void
  /** "Keep Editing": batal — tutup modal tanpa menjalankan aksi. */
  onClose: () => void
}

export default function UnsavedChangesModal({
  saving,
  onSave,
  onDiscard,
  onClose,
}: UnsavedChangesModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-sm rounded-2xl border border-slate-100 bg-white p-6 shadow-modal animate-in zoom-in-95 duration-150">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
            <Icon name="warning" className="text-xl" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Unsaved changes</h3>
            <p className="mt-1 text-sm leading-5 text-slate-500">
              This ticket has changes that haven&apos;t been saved yet. Save them before leaving, or discard
              the changes.
            </p>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant="destructive"
            size="lg"
            className="cursor-pointer"
            disabled={saving}
            onClick={onDiscard}
          >
            Discard
          </Button>
          <Button type="button" size="lg" className="cursor-pointer" disabled={saving} onClick={onSave}>
            {saving ? 'Saving...' : 'Save & Continue'}
          </Button>
        </div>
        <button
          type="button"
          className="mt-2 w-full cursor-pointer rounded-xl py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed"
          disabled={saving}
          onClick={onClose}
        >
          Keep Editing
        </button>
      </div>
    </div>
  )
}
