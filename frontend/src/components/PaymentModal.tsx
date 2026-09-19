import { useState } from 'react'
import type { CustomerGender, PaymentCategory } from '@/api/client'
import { formatRupiah } from '@/utils/format'
import { calculateChange } from '@/utils/financial'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import Icon from '@/components/ui/Icon'

const QUICK_CASH = [20000, 50000, 100000]

export type PaymentMethod = 'CASH' | 'THIRD_PARTY' | 'EDC'

interface PaymentModalProps {
  grandTotal: number
  itemCount: number
  tableNumber: string | null
  /** Gender pelanggan sudah dipilih di panel ORDER DETAIL, bukan di modal. */
  gender: CustomerGender | null
  submitting: boolean
  onSubmit: (payload: {
    customerGender: CustomerGender
    payment: { category: PaymentCategory; methodName: string; amountPaid: number }
  }) => void
  onClose: () => void
}

const METHOD_META: { key: PaymentMethod; label: string; icon: string }[] = [
  { key: 'CASH', label: 'Cash', icon: 'payments' },
  { key: 'THIRD_PARTY', label: 'QRIS / E-Wallet', icon: 'qr_code_2' },
  { key: 'EDC', label: 'EDC / Card', icon: 'credit_card' },
]

export default function PaymentModal({
  grandTotal,
  itemCount,
  tableNumber,
  gender,
  submitting,
  onSubmit,
  onClose,
}: PaymentModalProps) {
  const [method, setMethod] = useState<PaymentMethod>('CASH')
  const [selectedMethodName, setSelectedMethodName] = useState('Cash')
  const [cash, setCash] = useState<string>('')
  const [error, setError] = useState<string | null>(null)

  const parsedCash = cash === '' ? 0 : Number(cash)
  let changeDue: number | null = null
  // Jumlah kekurangan bayar (tunai < total). null saat tidak relevan.
  let shortfall: number | null = null
  if (method === 'CASH' && !Number.isNaN(parsedCash) && parsedCash > 0) {
    const isValid = Number.isInteger(parsedCash) && parsedCash >= grandTotal
    if (isValid) {
      try {
        changeDue = calculateChange(grandTotal, parsedCash)
      } catch {
        changeDue = null
      }
    } else if (parsedCash < grandTotal) {
      shortfall = grandTotal - parsedCash
    }
  }
  // Mode non-tunai: tombol Selesaikan tetap aktif (bayar penuh). Mode tunai
  // tanpa nominal, nominal pecahan, atau kurang dari total → tombol dimatikan.
  const isUnderpaid =
    method === 'CASH' &&
    (cash === '' || !Number.isInteger(parsedCash) || parsedCash < grandTotal)

  function handleSubmit() {
    setError(null)
    if (!gender) {
      setError('Select the customer gender in the Order Details panel first.')
      return
    }

    if (method === 'CASH') {
      const amountPaid = Number.isNaN(parsedCash) ? 0 : parsedCash
      try {
        calculateChange(grandTotal, amountPaid)
      } catch {
        setError('Cash amount must be a whole number at least equal to the total.')
        return
      }
      onSubmit({
        customerGender: gender,
        payment: { category: 'CASH', methodName: 'Cash', amountPaid },
      })
      return
    }

    // Non-tunai: bayar penuh.
    onSubmit({
      customerGender: gender,
      payment: { category: method, methodName: selectedMethodName, amountPaid: grandTotal },
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-2xl border border-slate-100 bg-white p-6 shadow-modal animate-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="font-display text-lg font-bold text-slate-900">Checkout</h2>
            <p className="text-xs text-slate-500">
              {tableNumber ? `Table ${tableNumber}` : 'Order'} • {itemCount} items
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-800"
          >
            <Icon name="close" className="text-lg" />
          </button>
        </div>

        {/* Total Tagihan Card */}
        <div className="mb-5 rounded-2xl border border-live-border bg-live-light p-4 text-center shadow-xs">
          <span className="font-display text-xs font-semibold uppercase tracking-wider text-primary">
            Amount Due
          </span>
          <div className="mt-1 font-display text-3xl font-black tracking-tight text-primary-dark tabular-nums">
            {formatRupiah(grandTotal)}
          </div>
        </div>

        {/* Metode Pembayaran */}
        <div className="mb-4">
          <label className="mb-1.5 block font-display text-xs font-bold uppercase tracking-wider text-slate-400">
            Payment Method
          </label>
          <div className="grid grid-cols-3 gap-2">
            {METHOD_META.map((m) => {
              const isSelected = method === m.key
              return (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => {
                    setMethod(m.key)
                    // Rekam label UTUH ('QRIS / E-Wallet'), bukan kata pertama.
                    setSelectedMethodName(m.label)
                  }}
                  className={cn(
                    'flex flex-col items-center justify-center gap-1.5 rounded-xl border p-2.5 text-xs font-semibold transition-all duration-150 active:scale-95',
                    isSelected
                      ? 'border-primary bg-primary/10 text-primary shadow-xs'
                      : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-800',
                  )}
                >
                  <Icon name={m.icon} className="text-xl" />
                  <span className="text-center leading-tight">{m.label.split(' ')[0]}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Cash Calculation Section */}
        {method === 'CASH' && (
          <div className="mb-5 space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-3.5">
            <div className="flex items-center justify-between">
              <span className="font-display text-xs font-bold uppercase tracking-wider text-slate-400">
                Cash Received
              </span>
            </div>

            {/* Quick Cash Buttons */}
            <div className="grid grid-cols-4 gap-1.5">
              <button
                type="button"
                onClick={() => setCash(String(grandTotal))}
                className={cn(
                  'flex h-11 items-center justify-center rounded-lg border px-2 text-xs font-bold transition-all active:scale-95',
                  parsedCash === grandTotal
                    ? 'border-primary bg-primary text-white'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
                )}
              >
                Exact
              </button>
              {QUICK_CASH.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setCash(String(v))}
                  className={cn(
                    'flex h-11 items-center justify-center rounded-lg border px-2 text-xs font-bold transition-all active:scale-95',
                    parsedCash === v
                      ? 'border-primary bg-primary text-white'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
                  )}
                >
                  {Math.round(v / 1000)}k
                </button>
              ))}
            </div>

            {/* Custom Input */}
            <div className="relative">
              <Input
                type="number"
                inputMode="numeric"
                placeholder="Enter another amount..."
                value={cash}
                onChange={(e) => setCash(e.target.value)}
                className="h-10 bg-white tabular-nums text-sm font-semibold"
              />
            </div>

            {/* Change Due Indicator */}
            {changeDue !== null && (
              <div className="flex items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-emerald-900 animate-in fade-in duration-150">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                  Change Due
                </span>
                <span className="text-lg font-black tracking-tight tabular-nums text-emerald-700">
                  {formatRupiah(changeDue)}
                </span>
              </div>
            )}

            {/* Underpaid Protection: button disabled + inline message */}
            {shortfall !== null && (
              <div className="flex items-center justify-between rounded-xl border border-destructive/25 bg-destructive/10 px-4 py-3 animate-in fade-in duration-150">
                <span className="text-xs font-bold uppercase tracking-wider text-destructive">
                  Shortage
                </span>
                <span className="text-sm font-bold tabular-nums text-destructive">
                  −{formatRupiah(shortfall)}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <p role="alert" className="mb-3 rounded-xl bg-destructive/10 px-3.5 py-2.5 text-xs font-semibold text-destructive">
            {error}
          </p>
        )}

        {/* Submit Button — gradien bismark */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || isUnderpaid}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-primary-dark font-display text-sm font-bold text-white shadow-btn-bismark transition active:scale-[0.98] hover:brightness-105 disabled:pointer-events-none disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, #447C84 0%, #53949e 100%)' }}
        >
          <Icon name="payments" className="text-lg" />
          {submitting ? 'Processing Payment...' : 'Complete Transaction'}
        </button>
      </div>
    </div>
  )
}
