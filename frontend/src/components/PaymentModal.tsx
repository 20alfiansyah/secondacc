import { useState } from 'react'
import { Banknote, CreditCard, QrCode, X } from 'lucide-react'
import type { CustomerGender, PaymentCategory } from '@/api/client'
import { formatRupiah } from '@/utils/format'
import { calculateChange } from '@/utils/financial'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

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

const METHOD_META: {
  key: PaymentMethod
  label: string
  methodName: string
  icon: typeof Banknote
}[] = [
  { key: 'CASH', label: 'Tunai (Cash)', methodName: 'Tunai', icon: Banknote },
  { key: 'THIRD_PARTY', label: 'QRIS / E-Wallet', methodName: 'QRIS', icon: QrCode },
  { key: 'EDC', label: 'Mesin EDC / Kartu', methodName: 'EDC', icon: CreditCard },
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
  const [selectedMethodName, setSelectedMethodName] = useState('Tunai')
  const [cash, setCash] = useState<string>('')
  const [error, setError] = useState<string | null>(null)

  const parsedCash = cash === '' ? 0 : Number(cash)
  let changeDue: number | null = null
  if (method === 'CASH' && !Number.isNaN(parsedCash) && parsedCash > 0) {
    try {
      changeDue = calculateChange(grandTotal, parsedCash)
    } catch {
      changeDue = null
    }
  }

  function handleSubmit() {
    setError(null)
    if (!gender) {
      setError('Pilih jenis kelamin pelanggan (P / L) di panel ORDER DETAIL terlebih dahulu.')
      return
    }

    if (method === 'CASH') {
      const amountPaid = Number.isNaN(parsedCash) ? 0 : parsedCash
      try {
        calculateChange(grandTotal, amountPaid)
      } catch {
        setError('Nominal uang tunai tidak mencukupi atau tidak valid.')
        return
      }
      onSubmit({
        customerGender: gender,
        payment: { category: 'CASH', methodName: 'Tunai', amountPaid },
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
      <div className="w-full max-w-md rounded-3xl border border-border/80 bg-card p-6 shadow-modal animate-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-foreground">Pembayaran Kasir</h2>
            <p className="text-xs text-muted-foreground">
              {tableNumber ? `Pesanan Meja ${tableNumber}` : 'Pesanan'} • {itemCount} item
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Total Tagihan Card */}
        <div className="mb-5 rounded-2xl border border-primary/20 bg-primary/10 p-4 text-center shadow-subtle">
          <span className="text-xs font-semibold uppercase tracking-wider text-primary">
            Total Tagihan
          </span>
          <div className="mt-1 text-3xl font-black tracking-tight text-primary tabular-nums">
            {formatRupiah(grandTotal)}
          </div>
        </div>

        {/* Metode Pembayaran */}
        <div className="mb-4">
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Metode Pembayaran
          </label>
          <div className="grid grid-cols-3 gap-2">
            {METHOD_META.map((m) => {
              const Icon = m.icon
              const isSelected = method === m.key
              return (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => {
                    setMethod(m.key)
                    setSelectedMethodName(m.methodName)
                  }}
                  className={cn(
                    'flex flex-col items-center justify-center gap-1.5 rounded-xl border p-2.5 text-xs font-semibold transition-all duration-150 active:scale-95',
                    isSelected
                      ? 'border-primary bg-primary/10 text-primary shadow-xs'
                      : 'border-border/80 bg-background text-muted-foreground hover:bg-accent hover:text-foreground',
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-center leading-tight">{m.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Cash Calculation Section */}
        {method === 'CASH' && (
          <div className="mb-5 space-y-3 rounded-2xl border border-border/80 bg-background/50 p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Uang Diterima (Tunai)
              </span>
            </div>

            {/* Quick Cash Buttons */}
            <div className="grid grid-cols-4 gap-1.5">
              <button
                type="button"
                onClick={() => setCash(String(grandTotal))}
                className={cn(
                  'rounded-lg border px-2 py-2 text-xs font-bold transition-all active:scale-95',
                  parsedCash === grandTotal
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border/80 bg-card hover:bg-accent text-foreground',
                )}
              >
                Uang Pas
              </button>
              {QUICK_CASH.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setCash(String(v))}
                  className={cn(
                    'rounded-lg border px-2 py-2 text-xs font-bold transition-all active:scale-95',
                    parsedCash === v
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border/80 bg-card hover:bg-accent text-foreground',
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
                placeholder="Masukkan nominal lain..."
                value={cash}
                onChange={(e) => setCash(e.target.value)}
                className="h-10 bg-card tabular-nums text-sm font-semibold"
              />
            </div>

            {/* Change Due Indicator */}
            {changeDue !== null && (
              <div className="flex items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-emerald-900 animate-in fade-in duration-150">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                  Uang Kembalian
                </span>
                <span className="text-lg font-black tracking-tight tabular-nums text-emerald-700">
                  {formatRupiah(changeDue)}
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

        {/* Submit Button */}
        <Button
          className="w-full h-12 text-sm font-bold shadow-sm"
          size="lg"
          onClick={handleSubmit}
          disabled={submitting}
        >
          <Banknote className="h-4 w-4" />
          {submitting ? 'Memproses Transaksi...' : 'Selesaikan Transaksi'}
        </Button>
      </div>
    </div>
  )
}

