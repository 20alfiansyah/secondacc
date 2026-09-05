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
  submitting: boolean
  onSubmit: (payload: {
    customerGender: CustomerGender
    payment: { category: PaymentCategory; methodName: string; amountPaid: number }
  }) => void
  onClose: () => void
}

const METHOD_META: { key: PaymentMethod; label: string; icon: typeof Banknote }[] = [
  { key: 'CASH', label: 'Tunai', icon: Banknote },
  { key: 'THIRD_PARTY', label: 'QRIS / Third-party', icon: QrCode },
  { key: 'EDC', label: 'EDC', icon: CreditCard },
]

export default function PaymentModal({
  grandTotal,
  itemCount,
  tableNumber,
  submitting,
  onSubmit,
  onClose,
}: PaymentModalProps) {
  const [gender, setGender] = useState<CustomerGender | null>(null)
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
      setError('Pilih jenis kelamin pelanggan (P / L).')
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-background p-6 shadow-lg">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold">Pembayaran</h2>
            <p className="text-sm text-muted-foreground">
              {tableNumber ? `Meja ${tableNumber}` : 'Total'} • {itemCount} item
            </p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Ringkasan total */}
        <div className="mb-4 rounded-lg bg-muted/50 px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total Tagihan</span>
            <span className="text-xl font-bold">{formatRupiah(grandTotal)}</span>
          </div>
        </div>

        {/* Gender */}
        <div className="mb-4">
          <p className="mb-2 text-sm font-medium">Jenis Kelamin Pelanggan</p>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                { v: 'L' as CustomerGender, label: '👨 Laki-laki' },
                { v: 'P' as CustomerGender, label: '👩 Perempuan' },
              ]
            ).map((opt) => (
              <button
                key={opt.v}
                onClick={() => setGender(opt.v)}
                className={cn(
                  'rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors',
                  gender === opt.v
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-background hover:bg-accent',
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Metode bayar */}
        <div className="mb-4">
          <p className="mb-2 text-sm font-medium">Metode Pembayaran</p>
          <div className="grid grid-cols-3 gap-2">
            {METHOD_META.map((m) => {
              const Icon = m.icon
              return (
                <button
                  key={m.key}
                  onClick={() => {
                    setMethod(m.key)
                    setSelectedMethodName(m.label)
                  }}
                  className={cn(
                    'flex flex-col items-center gap-1 rounded-lg border px-2 py-2.5 text-xs font-medium transition-colors',
                    method === m.key
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-background hover:bg-accent',
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {m.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Tunai */}
        {method === 'CASH' && (
          <div className="mb-4 space-y-3">
            <p className="text-sm font-medium">Uang Diterima</p>
            <div className="grid grid-cols-4 gap-2">
              <button
                onClick={() => setCash(String(grandTotal))}
                className="rounded-lg border border-border px-2 py-2 text-xs font-medium hover:bg-accent"
              >
                Uang Pas
              </button>
              {QUICK_CASH.map((v) => (
                <button
                  key={v}
                  onClick={() => setCash(String(v))}
                  className="rounded-lg border border-border px-2 py-2 text-xs font-medium hover:bg-accent"
                >
                  {Math.round(v / 1000)}k
                </button>
              ))}
            </div>
            <Input
              type="number"
              inputMode="numeric"
              placeholder="Nominal lain"
              value={cash}
              onChange={(e) => setCash(e.target.value)}
            />
            {changeDue !== null && (
              <div className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3">
                <span className="text-sm text-muted-foreground">Kembalian</span>
                <span className="text-lg font-semibold">{formatRupiah(changeDue)}</span>
              </div>
            )}
          </div>
        )}

        {error && (
          <p role="alert" className="mb-3 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <Button className="w-full" size="lg" onClick={handleSubmit} disabled={submitting}>
          {submitting ? 'Memproses…' : 'Selesaikan Transaksi'}
        </Button>
      </div>
    </div>
  )
}
