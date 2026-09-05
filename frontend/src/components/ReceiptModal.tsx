import { CheckCircle2, Printer, X } from 'lucide-react'
import type { CheckoutResult, OrderDetail } from '@/api/client'
import { formatRupiah } from '@/utils/format'
import { Button } from '@/components/ui/button'

const CAFE_NAME = 'CAFE POS'

interface ReceiptModalProps {
  /** CheckoutResult (alur bayar) atau OrderDetail (re-print dari riwayat). */
  order: CheckoutResult | OrderDetail
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-sm overflow-hidden rounded-3xl border border-border/80 bg-card shadow-modal animate-in zoom-in-95 duration-150">
        {/* Bar aksi (tidak ikut tercetak saat window.print) */}
        <div className="flex items-center justify-between border-b border-border/70 px-5 py-3.5 bg-muted/40">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-bold text-foreground">Struk Transaksi</h2>
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              onClick={() => window.print()}
              className="h-8 rounded-xl px-3 font-semibold shadow-xs"
            >
              <Printer className="h-3.5 w-3.5" />
              Cetak
            </Button>
            <button
              onClick={onClose}
              className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Struk Fisik Thermal (area yang dicetak & dipratinjau) */}
        <div className="p-6 bg-background">
          <div className="receipt rounded-2xl border border-dashed border-border/80 bg-card p-4 shadow-subtle">
            <div className="receipt__head text-center">
              <p className="receipt__name text-base font-extrabold tracking-wider text-foreground">
                {CAFE_NAME}
              </p>
              <p className="receipt__meta mt-1 text-[11px] text-muted-foreground">
                Invoice: {order.invoiceNumber}
              </p>
              {order.customerName && (
                <p className="receipt__meta text-[11px] text-muted-foreground">
                  Pelanggan: {order.customerName}
                </p>
              )}
              <p className="receipt__meta text-[11px] text-muted-foreground">
                {formatDate(order.payment?.paidAt ?? null)}
              </p>
            </div>

            <div className="my-3 border-t border-dashed border-border" />

            <div className="space-y-2">
              {order.items.map((item, idx) => (
                <div key={idx}>
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="receipt__line text-foreground">{item.productName}</span>
                    <span className="receipt__line tabular-nums text-foreground">
                      {formatRupiah(item.unitPrice * item.quantity)}
                    </span>
                  </div>
                  <div className="receipt__line receipt__line--dim text-[11px] text-muted-foreground tabular-nums">
                    {item.quantity} x {formatRupiah(item.unitPrice)}
                    {item.notes ? ` • (${item.notes})` : ''}
                  </div>
                </div>
              ))}
            </div>

            <div className="my-3 border-t border-dashed border-border" />

            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Subtotal</span>
              <span className="tabular-nums font-medium">{formatRupiah(order.grandTotal)}</span>
            </div>
            <div className="mt-1 flex justify-between text-sm font-bold text-foreground">
              <span>Total Tagihan</span>
              <span className="receipt__total tabular-nums text-primary font-black">
                {formatRupiah(order.grandTotal)}
              </span>
            </div>

            <div className="my-3 border-t border-dashed border-border" />

            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Metode Bayar</span>
              <span className="font-semibold text-foreground">{order.payment.methodName}</span>
            </div>
            <div className="mt-0.5 flex justify-between text-xs text-muted-foreground">
              <span>Uang Diterima</span>
              <span className="tabular-nums font-semibold text-foreground">
                {formatRupiah(order.payment.amountPaid)}
              </span>
            </div>
            {order.payment.changeDue > 0 && (
              <div className="mt-0.5 flex justify-between text-xs text-emerald-700 font-bold">
                <span>Kembalian</span>
                <span className="tabular-nums font-black text-emerald-700">
                  {formatRupiah(order.payment.changeDue)}
                </span>
              </div>
            )}

            <div className="receipt__footer mt-4 border-t border-dashed border-border pt-3 text-center text-[11px] text-muted-foreground">
              Terima kasih atas kunjungan Anda! 🙏
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

