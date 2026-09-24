import { useCallback, useEffect, useState } from 'react'
import axios from 'axios'
import type { CustomerGender, OrderDetail, OrderSummary } from '@/api/client'
import { fetchOrderDetail, fetchOrderHistory } from '@/api/client'
import EmptyState from '@/components/ui/EmptyState'
import Icon from '@/components/ui/Icon'
import PrimaryAction from '@/components/ui/PrimaryAction'
import ReceiptModal from '@/components/ReceiptModal'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { formatDateTime, formatRupiah } from '@/utils/format'

/** Filter form — search dipicu onEnter, sisanya langsung memicu fetch ulang. */
interface HistoryFilters {
  from: string
  to: string
  search: string
  gender: 'ALL' | CustomerGender
  product: string
}

const EMPTY_FILTERS: HistoryFilters = { from: '', to: '', search: '', gender: 'ALL', product: '' }

/**
 * Halaman Riwayat & Laporan (Task 3.4F) — tabel transaksi PAID + filter
 * (tanggal, nama produk, gender) + export CSV + reprint struk.
 * Reprint reuse ReceiptModal dari POS — GET /api/orders/:id cukup, tanpa endpoint baru.
 */
export default function HistoryPage() {
  const [items, setItems] = useState<OrderSummary[]>([])
  const [listLoading, setListLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filter aktif tersimpan di state items hasil load; draft di bawah untuk form Apply.
  const [draft, setDraft] = useState<HistoryFilters>(EMPTY_FILTERS)

  const [exporting, setExporting] = useState(false)
  const [receipt, setReceipt] = useState<OrderDetail | null>(null)

  const loadHistory = useCallback(async (f: HistoryFilters) => {
    let cancelled = false
    setListLoading(true)
    setError(null)
    try {
      const data = await fetchOrderHistory({
        from: f.from || undefined,
        to: f.to || undefined,
        search: f.search.trim() || undefined,
        gender: f.gender === 'ALL' ? undefined : f.gender,
        product: f.product.trim() || undefined,
      })
      if (!cancelled) setItems(data)
    } catch {
      if (!cancelled) setError('Failed to load sales history. Please try again.')
    } finally {
      if (!cancelled) setListLoading(false)
    }
    return () => {
      cancelled = true
    }
  }, [])

  // Muat awal sekali dengan filter kosong.
  useEffect(() => {
    void loadHistory(EMPTY_FILTERS)
  }, [loadHistory])

  // Submit tombol/Enter → commit draft ke API sekali (tidak per-karakter).
  function applyDraft() {
    void loadHistory({ ...draft, product: draft.product.trim() })
  }

  /** Klik baris → detail order → ReceiptModal (reuse POS); cetak dari tombol Print modal. */
  async function handleReprint(orderId: number) {
    try {
      const detail = await fetchOrderDetail(orderId)
      setReceipt(detail)
    } catch (err) {
      const data = axios.isAxiosError(err)
        ? (err.response?.data as { message?: string } | undefined)
        : undefined
      setError(data?.message ?? 'Failed to prepare the receipt. Please try again.')
    }
  }

  /** Export CSV dari baris terfilter: BOM UTF-8 + nilai di-quote (Excel-safe), koma di-escape. */
  function handleExportCsv() {
    if (items.length === 0 || exporting) return
    setExporting(true)
    try {
      const HEADER = 'Invoice,Date,Customer,Gender,Payment Method,Total'
      const rows = items.map((o) =>
        [
          o.invoiceNumber,
          formatDateTime(o.createdAt),
          o.customerName?.trim() || '-',
          o.customerGender === 'L' ? 'Male' : o.customerGender === 'P' ? 'Female' : '-',
          o.paymentName ?? '-',
          String(o.grandTotal),
        ]
          .map(csvEscape)
          .join(','),
      )
      // BOM UTF-8 agar Excel mengenali file sebagai UTF-8.
      const csv = '\uFEFF' + [HEADER, ...rows].join('\r\n')
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `sales-report-${csvTimestamp()}.csv`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(url)
    } finally {
      setExporting(false)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-col items-start gap-3 space-y-0 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="space-y-0.5">
          {/* Header band gaya POS: ikon + judul uppercase + subtitle di bawah. */}
          <div className="flex items-center gap-2">
            <Icon name="analytics" className="text-[20px] text-[#447C84]" />
            <span className="font-display text-xs font-bold uppercase tracking-wider text-slate-900">
              SALES HISTORY
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Completed transactions — filter, export CSV, and reprint receipts.
          </p>
        </div>
        <PrimaryAction onClick={handleExportCsv} disabled={exporting || listLoading || items.length === 0}>
          <Icon name="download" className="text-sm" />
          {exporting ? 'Exporting...' : 'Export CSV'}
        </PrimaryAction>
      </CardHeader>
      <CardContent className="space-y-2.5 p-4 pt-0 sm:p-6 sm:pt-0">
        {/* Filter bar: semua input mengikat draft; API hanya di-hit lewat tombol Apply Filter / Enter. */}
        <form
          className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-6"
          onSubmit={(e) => {
            e.preventDefault()
            applyDraft()
          }}
          onReset={(e) => {
            e.preventDefault()
            setDraft(EMPTY_FILTERS)
            void loadHistory(EMPTY_FILTERS)
          }}
        >
          <Input
            type="date"
            aria-label="Date from"
            value={draft.from}
            max={draft.to || undefined}
            onChange={(e) => setDraft({ ...draft, from: e.target.value })}
          />
          <Input
            type="date"
            aria-label="Date to"
            value={draft.to}
            min={draft.from || undefined}
            onChange={(e) => setDraft({ ...draft, to: e.target.value })}
          />
          <div className="relative">
            <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-base text-slate-400" />
            <Input
              value={draft.product}
              onChange={(e) => setDraft({ ...draft, product: e.target.value })}
              placeholder="Search product name..."
              aria-label="Search product"
              className="bg-background pl-9 text-sm"
            />
          </div>
          <select
            aria-label="Customer gender"
            value={draft.gender}
            onChange={(e) => setDraft({ ...draft, gender: e.target.value as HistoryFilters['gender'] })}
            className="h-10 rounded-xl border border-input/80 bg-background px-3 text-sm text-foreground shadow-subtle transition-all duration-150 focus-visible:border-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
          >
            <option value="ALL">All</option>
            <option value="L">Male</option>
            <option value="P">Female</option>
          </select>
          {/* Aksi filter: Apply (submit) + Reset (reset form) — di baris terpisah agar rapi. */}
          <div className="flex gap-2 sm:col-span-2 lg:col-span-4">
            <button
              type="submit"
              disabled={listLoading}
              className="h-10 rounded-xl bg-[#447C84] px-4 text-xs font-semibold text-white transition hover:bg-[#3a6b72] disabled:opacity-50"
            >
              {listLoading ? 'Loading...' : 'Apply Filters'}
            </button>
            <button
              type="reset"
              disabled={listLoading}
              className="h-10 rounded-xl border border-slate-200/80 px-4 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              Reset
            </button>
          </div>
        </form>
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
            icon="receipt_long"
            title="Loading history..."
            description="Fetching paid transactions from the server."
          />
        ) : items.length === 0 ? (
          <EmptyState
            icon="receipt_long"
            title="No transactions found"
            description="Paid transactions will appear here. Adjust the filters to widen the search."
          />
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-border/70">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border/70 bg-secondary/40 text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3 font-bold">Invoice</th>
                  <th className="px-4 py-3 font-bold">Date</th>
                  <th className="px-4 py-3 font-bold">Customer</th>
                  <th className="px-4 py-3 font-bold">Gender</th>
                  <th className="px-4 py-3 font-bold">Payment Method</th>
                  <th className="px-4 py-3 text-right font-bold">Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((o) => (
                  <tr
                    key={o.id}
                    onClick={() => handleReprint(o.id)}
                    className="cursor-pointer border-b border-border/60 bg-white transition last:border-b-0 hover:bg-slate-50"
                  >
                    <td className="px-4 py-3 text-sm font-bold text-foreground">{o.invoiceNumber}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{formatDateTime(o.createdAt)}</td>
                    <td className="px-4 py-3 text-sm text-foreground">
                      {o.customerName?.trim() || 'Customer'}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {o.customerGender === 'L' ? 'Male' : o.customerGender === 'P' ? 'Female' : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{o.paymentName ?? '—'}</td>
                    <td className="px-4 py-3 text-right text-sm font-black text-primary tabular-nums">
                      {formatRupiah(o.grandTotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>

      {/* Preview struk reprint — reuse ReceiptModal POS; window.print() dari tombol Print modal. */}
      {receipt && <ReceiptModal order={receipt} onClose={() => setReceipt(null)} />}
    </Card>
  )
}

/** Quote nilai CSV; kutip ganda di-escape dengan penggandaan (Excel-safe). */
function csvEscape(value: string): string {
  return `"${value.replaceAll('"', '""')}"`
}

/** Stempel waktu nama file CSV: YYYYMMDD-HHmm (waktu lokal). */
function csvTimestamp(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`
}
