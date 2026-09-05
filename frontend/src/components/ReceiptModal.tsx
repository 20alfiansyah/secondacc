import { Printer, X } from 'lucide-react'
import type { CheckoutResult } from '@/api/client'
import { formatRupiah } from '@/utils/format'
import { Button } from '@/components/ui/button'

const CAFE_NAME = 'Cafe POS'

interface ReceiptModalProps {
  order: CheckoutResult
  onClose: () => void
}

function formatDate(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleString('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function ReceiptModal({ order, onClose }: ReceiptModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-background shadow-lg">
        {/* Bar aksi (tidak ikut tercetak) */}
        <div className="flex items-center justify-between border-b p-3">
          <h2 className="text-sm font-semibold">Struk Belanja</h2>
          <div className="flex items-center gap-1">
            <Button size="sm" onClick={() => window.print()}>
              <Printer className="h-4 w-4" />
              Cetak
            </Button>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Struk (area yang dicetak) */}
        <div className="receipt p-4">
          <div className="receipt__head text-center">
            <p className="receipt__name">{CAFE_NAME}</p>
            <p className="receipt__meta">Invoice: {order.invoiceNumber}</p>
            <p className="receipt__meta">{formatDate(order.payment.paidAt)}</p>
          </div>

          <div className="my-3 border-t border-dashed" />

          <div className="space-y-2">
            {order.items.map((item, idx) => (
              <div key={idx}>
                <div className="flex justify-between">
                  <span className="receipt__line">{item.productName}</span>
                  <span className="receipt__line">{formatRupiah(item.unitPrice * item.quantity)}</span>
                </div>
                <div className="receipt__line receipt__line--dim">
                  {item.quantity} x {formatRupiah(item.unitPrice)}
                  {item.notes ? ` • ${item.notes}` : ''}
                </div>
              </div>
            ))}
          </div>

          <div className="my-3 border-t border-dashed" />

          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{formatRupiah(order.grandTotal)}</span>
          </div>
          <div className="flex justify-between">
            <span>Total</span>
            <span className="receipt__total">{formatRupiah(order.grandTotal)}</span>
          </div>

          <div className="my-3 border-t border-dashed" />

          <div className="flex justify-between">
            <span>Metode Bayar</span>
            <span>{order.payment.methodName}</span>
          </div>
          <div className="flex justify-between">
            <span>Uang Bayar</span>
            <span>{formatRupiah(order.payment.amountPaid)}</span>
          </div>
          {order.payment.changeDue > 0 && (
            <div className="flex justify-between">
              <span>Kembalian</span>
              <span>{formatRupiah(order.payment.changeDue)}</span>
            </div>
          )}

          <div className="receipt__footer mt-4 text-center">
            Terima kasih atas kunjungan Anda 🙏
          </div>
        </div>
      </div>
    </div>
  )
}
