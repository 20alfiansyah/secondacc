import { useEffect, useState } from 'react'
import axios from 'axios'
import type { PaymentCategory, PaymentChannel } from '@/api/client'
import { createPaymentChannel, fetchPaymentChannels, togglePaymentChannel } from '@/api/client'
import EmptyState from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import PrimaryAction from '@/components/ui/PrimaryAction'
import Icon from '@/components/ui/Icon'
import StatusPill from '@/components/ui/StatusPill'
import { cn } from '@/lib/utils'

const CATEGORY_META: Record<PaymentCategory, { label: string; icon: string }> = {
  CASH: { label: 'Cash', icon: 'payments' },
  THIRD_PARTY: { label: 'QRIS / E-Wallet', icon: 'qr_code_2' },
  EDC: { label: 'EDC / Card', icon: 'credit_card' },
}

/** Halaman pengaturan channel pembayaran (Task 2.3F) — daftar + toggle + tambah. */
export default function PaymentPage() {
  const [channels, setChannels] = useState<PaymentChannel[]>([])
  const [listLoading, setListLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [addOpen, setAddOpen] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [confirmTarget, setConfirmTarget] = useState<PaymentChannel | null>(null)
  const [togglingId, setTogglingId] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setListLoading(true)
      setError(null)
      try {
        // Tanpa filter: halaman admin melihat channel aktif + nonaktif.
        const data = await fetchPaymentChannels()
        if (!cancelled) setChannels(data)
      } catch {
        if (!cancelled) setError('Failed to load payment channels. Try again.')
      } finally {
        if (!cancelled) setListLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  async function handleCreate(input: { name: string; category: PaymentCategory }) {
    setSaving(true)
    setServerError(null)
    try {
      const created = await createPaymentChannel(input)
      setChannels((prev) => [created, ...prev])
      setAddOpen(false)
    } catch (err) {
      // Body error backend: { code, message } — pakai pesan server bila ada.
      const data = axios.isAxiosError(err)
        ? (err.response?.data as { message?: string } | undefined)
        : undefined
      setServerError(data?.message ?? 'Failed to add channel. Try again.')
    } finally {
      setSaving(false)
    }
  }

  async function handleToggle() {
    if (!confirmTarget) return
    setTogglingId(confirmTarget.id)
    try {
      const updated = await togglePaymentChannel(confirmTarget.id)
      setChannels((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))
      setConfirmTarget(null)
    } catch (err) {
      const data = axios.isAxiosError(err)
        ? (err.response?.data as { message?: string } | undefined)
        : undefined
      setError(data?.message ?? 'Failed to update channel status. Try again.')
      setConfirmTarget(null)
    } finally {
      setTogglingId(null)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-col items-start gap-3 space-y-0 sm:flex-row sm:items-center sm:justify-between p-4 sm:p-6">
        <div className="space-y-0.5">
          {/* Header band gaya POS: ikon + judul uppercase + subtitle di bawah. */}
          <div className="flex items-center gap-2">
            <Icon name="payments" className="text-[20px] text-[#447C84]" />
            <span className="font-display text-xs font-bold uppercase tracking-wider text-slate-900">PAYMENT CHANNELS</span>
          </div>
          <p className="text-xs text-slate-400">Active channels appear as payment options on the cashier screen (POS).</p>
        </div>
        <PrimaryAction
          onClick={() => {
            setServerError(null)
            setAddOpen(true)
          }}
        >
          <Icon name="add" className="text-sm" />
          Add Channel
        </PrimaryAction>
      </CardHeader>
      <CardContent className="space-y-2.5 p-4 pt-0 sm:p-6 sm:pt-0">
        {error && (
          <p
            role="alert"
            className="rounded-xl bg-destructive/10 px-3.5 py-2.5 text-xs font-semibold text-destructive"
          >
            {error}
          </p>
        )}

        {listLoading ? (
          <EmptyState
            loading
            icon="payments"
            title="Loading channels..."
            description="Fetching payment channels from the server."
          />
        ) : channels.length === 0 ? (
          <EmptyState
            icon="payments"
            title="No channels yet"
            description="Add payment channels such as Cash, QRIS, or EDC so cashiers can use them."
          />
        ) : (
          channels.map((channel) => (
            <div
              key={channel.id}
              className="flex items-center gap-3 rounded-xl border border-border/70 bg-white px-4 py-3"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-light text-primary">
                <Icon name={CATEGORY_META[channel.category].icon} className="text-lg" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-sm font-bold text-foreground">
                  {channel.name}
                </p>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {CATEGORY_META[channel.category].label}
                </p>
              </div>
              <span className="hidden sm:inline">
                <StatusPill active={channel.isActive} />
              </span>
              <Switch
                checked={channel.isActive}
                disabled={togglingId === channel.id}
                onClick={() => setConfirmTarget(channel)}
              />
            </div>
          ))
        )}
      </CardContent>

      {addOpen && (
        <AddChannelDialog
          saving={saving}
          serverError={serverError}
          onClose={() => setAddOpen(false)}
          onSubmit={handleCreate}
        />
      )}

      {confirmTarget && (
        <ToggleConfirmDialog
          channel={confirmTarget}
          busy={togglingId === confirmTarget.id}
          onClose={() => setConfirmTarget(null)}
          onConfirm={handleToggle}
        />
      )}
    </Card>
  )
}

/** Switch aktif/nonaktif bergaya Material — tanpa library. */
function Switch({
  checked,
  disabled,
  onClick,
}: {
  checked: boolean
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'relative h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        checked ? 'bg-live' : 'bg-slate-300',
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-all',
          checked ? 'left-[22px]' : 'left-0.5',
        )}
      />
    </button>
  )
}

/** Dialog tambah channel: name + category (server error ditampilkan apa adanya). */
function AddChannelDialog({
  saving,
  serverError,
  onClose,
  onSubmit,
}: {
  saving: boolean
  serverError: string | null
  onClose: () => void
  onSubmit: (input: { name: string; category: PaymentCategory }) => void
}) {
  const [name, setName] = useState('')
  const [category, setCategory] = useState<PaymentCategory>('CASH')
  const [nameError, setNameError] = useState<string | null>(null)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) {
      setNameError('Channel name is required.')
      return
    }
    setNameError(null)
    onSubmit({ name: trimmed, category })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-2xl border border-slate-100 bg-white p-6 shadow-modal animate-in zoom-in-95 duration-150"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-slate-900">Add Channel</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-800"
          >
            <Icon name="close" className="text-lg" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="channel-name"
              className="block font-display text-xs font-bold uppercase tracking-wider text-slate-400"
            >
              Channel Name
            </label>
            <Input
              id="channel-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Cash, QRIS BCA, EDC Mandiri"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="channel-category"
              className="block font-display text-xs font-bold uppercase tracking-wider text-slate-400"
            >
              Category
            </label>
            <select
              id="channel-category"
              value={category}
              onChange={(e) => setCategory(e.target.value as PaymentCategory)}
              className="h-10 w-full cursor-pointer rounded-xl border border-input/80 bg-background px-3.5 text-sm shadow-subtle transition-all duration-150 focus-visible:border-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
            >
              <option value="CASH">Cash</option>
              <option value="THIRD_PARTY">QRIS / E-Wallet</option>
              <option value="EDC">EDC / Card</option>
            </select>
          </div>

          {(nameError || serverError) && (
            <p
              role="alert"
              className="rounded-xl bg-destructive/10 px-3.5 py-2.5 text-xs font-semibold text-destructive"
            >
              {nameError ?? serverError}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}

/** Konfirmasi toggle: channel nonaktif langsung hilang dari pilihan kasir. */
function ToggleConfirmDialog({
  channel,
  busy,
  onClose,
  onConfirm,
}: {
  channel: PaymentChannel
  busy: boolean
  onClose: () => void
  onConfirm: () => void
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !busy) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [busy, onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onClose()
      }}
    >
      <div className="w-full max-w-sm rounded-2xl border border-slate-100 bg-white p-6 shadow-modal animate-in zoom-in-95 duration-150">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-light text-primary">
            <Icon name="payments" className="text-xl" />
          </div>
          <h2 className="font-display text-base font-bold text-slate-900">
            {channel.isActive ? 'Deactivate channel?' : 'Activate channel?'}
          </h2>
        </div>
        <p className="text-sm text-slate-500">
          {channel.isActive
            ? `"${channel.name}" will be removed from payment options on the cashier screen.`
            : `"${channel.name}" will appear again as a payment option on the cashier screen.`}
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="outline" disabled={busy} onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={busy}>
            {busy ? 'Processing...' : 'Yes, Continue'}
          </Button>
        </div>
      </div>
    </div>
  )
}
