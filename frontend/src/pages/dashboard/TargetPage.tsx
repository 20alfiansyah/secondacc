import { useEffect, useState } from 'react'
import axios from 'axios'
import type { MonthlyTarget } from '@/api/client'
import { fetchMonthlyTarget, saveMonthlyTarget } from '@/api/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import EmptyState from '@/components/ui/EmptyState'
import Icon from '@/components/ui/Icon'
import { Input } from '@/components/ui/input'
import { formatRupiah } from '@/utils/format'

/** Label bulan (UI English) — index 0 = January, value select = 1..12. */
const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

/** Batas validasi sesuai kontrak backend §4.2 (docs/10_PHASE3_IMPLEMENTATION.md). */
const MAX_TARGET_AMOUNT = 1_000_000_000_000
const MIN_YEAR = 2000
const MAX_YEAR = 2100

/**
 * Halaman pengaturan target omset bulanan (Task 3.3F).
 * Prefill dari GET /api/targets (default bulan berjalan), form bulan/tahun/
 * nominal (teks digit murni → integer), simpan via PUT upsert + refetch.
 */
export default function TargetPage() {
  // Kondisi target tersimpan terakhir yang diketahui dari server (GET terakhir).
  const [saved, setSaved] = useState<MonthlyTarget | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Form: default periode = bulan berjalan; nominal disimpan sebagai teks digit
  // murni lalu dikonversi ke integer saat save (uang wajib integer, bukan float).
  const [month, setMonth] = useState(() => new Date().getMonth() + 1)
  const [year, setYear] = useState(() => String(new Date().getFullYear()))
  const [amount, setAmount] = useState('')

  const [formError, setFormError] = useState<string | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setLoadError(null)
      try {
        // Tanpa param: server memakai default bulan berjalan (kontrak §4.2).
        const data = await fetchMonthlyTarget()
        if (cancelled) return
        setSaved(data)
        setMonth(data.month)
        setYear(String(data.year))
        setAmount(data.targetAmount === null ? '' : String(data.targetAmount))
      } catch {
        if (!cancelled) setLoadError('Failed to load the current target. Try again.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  const yearNum = Number(year)
  const yearValid = /^\d{4}$/.test(year) && yearNum >= MIN_YEAR && yearNum <= MAX_YEAR
  const periodLabel = yearValid ? `${MONTHS[month - 1]} ${yearNum}` : MONTHS[month - 1]
  // True saat form mengedit periode yang berbeda dari data tersimpan terakhir.
  const editingOtherPeriod =
    saved !== null && (saved.month !== month || saved.year !== yearNum)

  async function handleSave() {
    // Validasi client: blok save bila tahun invalid / nominal kosong / melebihi
    // batas kontrak. Digit murni menjamin integer non-negatif.
    if (!yearValid) {
      setFormError(`Year must be between ${MIN_YEAR} and ${MAX_YEAR}.`)
      return
    }
    if (amount === '') {
      setFormError('Target amount is required.')
      return
    }
    const amountNum = Number(amount)
    if (amountNum > MAX_TARGET_AMOUNT) {
      setFormError('Target amount must be at most 1,000,000,000,000.')
      return
    }
    setFormError(null)

    // Konfirmasi pola native (sama seperti archive di ManageCategoriesDialog).
    if (
      !window.confirm(
        `Save monthly target for ${MONTHS[month - 1]} ${yearNum} — ${formatRupiah(amountNum)}?`,
      )
    ) {
      return
    }

    setSaving(true)
    setServerError(null)
    try {
      await saveMonthlyTarget({ month, year: yearNum, targetAmount: amountNum })
      // Refetch (baca kembali) agar form & ringkasan menampilkan data server.
      const fresh = await fetchMonthlyTarget({ month, year: yearNum })
      setSaved(fresh)
      setAmount(fresh.targetAmount === null ? '' : String(fresh.targetAmount))
      setNotice(`Monthly target for ${MONTHS[fresh.month - 1]} ${fresh.year} saved.`)
    } catch (err) {
      // Body error backend: { code, message } — pakai pesan server bila ada.
      const data = axios.isAxiosError(err)
        ? (err.response?.data as { message?: string } | undefined)
        : undefined
      setServerError(data?.message ?? 'Failed to save the monthly target. Try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader className="p-4 sm:p-6">
        {/* Header band gaya POS: ikon + judul uppercase + subtitle di bawah. */}
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <Icon name="flag" className="text-[20px] text-[#447C84]" />
            <span className="font-display text-xs font-bold uppercase tracking-wider text-slate-900">
              MONTHLY TARGET
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Set the revenue goal for one calendar month — the dashboard progress bar tracks this
            target.
          </p>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 p-4 pt-0 sm:p-6 sm:pt-0">
        {loadError && (
          <p
            role="alert"
            className="rounded-xl bg-destructive/10 px-3.5 py-2.5 text-xs font-semibold text-destructive"
          >
            {loadError}
          </p>
        )}

        {loading ? (
          <EmptyState
            loading
            icon="flag"
            title="Loading target..."
            description="Fetching the current monthly target from the server."
          />
        ) : (
          <>
            {/* Ringkasan target tersimpan menurut server (periode terpilih). */}
            {saved && (
              <div className="flex items-center gap-3 rounded-xl border border-border/70 bg-white px-4 py-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-light text-primary">
                  <Icon name="payments" className="text-lg" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Current target — {periodLabel}
                  </p>
                  <p className="font-display text-lg font-bold text-foreground">
                    {saved.targetAmount === null ? 'Not set yet' : formatRupiah(saved.targetAmount)}
                  </p>
                </div>
              </div>
            )}
            {editingOtherPeriod && (
              <p className="text-[11px] text-muted-foreground">
                The form is editing {periodLabel} — press Save to set the target for that period.
              </p>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault()
                void handleSave()
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label
                    htmlFor="target-month"
                    className="block font-display text-xs font-bold uppercase tracking-wider text-slate-400"
                  >
                    Month
                  </label>
                  <select
                    id="target-month"
                    value={month}
                    onChange={(e) => setMonth(Number(e.target.value))}
                    className="h-10 w-full cursor-pointer rounded-xl border border-input/80 bg-background px-3.5 text-sm shadow-subtle transition-all duration-150 focus-visible:border-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
                  >
                    {MONTHS.map((label, index) => (
                      <option key={label} value={index + 1}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="target-year"
                    className="block font-display text-xs font-bold uppercase tracking-wider text-slate-400"
                  >
                    Year
                  </label>
                  <Input
                    id="target-year"
                    value={year}
                    inputMode="numeric"
                    maxLength={4}
                    placeholder="e.g. 2026"
                    onChange={(e) => setYear(e.target.value.replace(/\D/g, ''))}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="target-amount"
                  className="block font-display text-xs font-bold uppercase tracking-wider text-slate-400"
                >
                  Target Amount (Rp)
                </label>
                {/* Input teks digit murni: strip non-digit → integer rupiah. */}
                <Input
                  id="target-amount"
                  value={amount}
                  inputMode="numeric"
                  maxLength={13}
                  placeholder="e.g. 50000000"
                  onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))}
                />
                {/* Pratinjau terformat supaya salah ketik nominal terlihat sebelum save. */}
                {amount !== '' && (
                  <p className="text-xs text-muted-foreground">= {formatRupiah(Number(amount))}</p>
                )}
              </div>

              {(formError || serverError) && (
                <p
                  role="alert"
                  className="rounded-xl bg-destructive/10 px-3.5 py-2.5 text-xs font-semibold text-destructive"
                >
                  {formError ?? serverError}
                </p>
              )}

              <div className="flex justify-end pt-1">
                <Button type="submit" disabled={saving}>
                  {saving ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </form>
          </>
        )}
      </CardContent>

      {notice && <AutoHideNotice message={notice} onDone={() => setNotice(null)} />}
    </Card>
  )
}

/** Notice sukses non-modal ala POS: toast bawah-tengah, auto-hide 4 detik. */
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
